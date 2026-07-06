# Minimal static file server for local preview (no Python/Node required).
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File serve.ps1 [-Port 4173]
param([int]$Port = 4173)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".htm"  = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".svg"  = "image/svg+xml"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".gif"  = "image/gif"
  ".webp" = "image/webp"
  ".ico"  = "image/x-icon"
  ".woff" = "font/woff"
  ".woff2" = "font/woff2"
  ".txt"  = "text/plain; charset=utf-8"
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $root at http://localhost:$Port/"

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response
    $res.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")

    try {
      $relPath = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath).TrimStart('/')
      if ($relPath -eq "") { $relPath = "index.html" }

      $fullPath = [System.IO.Path]::GetFullPath((Join-Path $root $relPath))

      # Keep requests inside the site root
      if (-not $fullPath.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
        $res.StatusCode = 403
      }
      elseif (Test-Path $fullPath -PathType Container) {
        $index = Join-Path $fullPath "index.html"
        if (Test-Path $index -PathType Leaf) { $fullPath = $index } else { $res.StatusCode = 404 }
      }
      elseif (-not (Test-Path $fullPath -PathType Leaf)) {
        $res.StatusCode = 404
      }

      if ($res.StatusCode -eq 200 -and (Test-Path $fullPath -PathType Leaf)) {
        $ext = [System.IO.Path]::GetExtension($fullPath).ToLower()
        if ($mime.ContainsKey($ext)) { $res.ContentType = $mime[$ext] } else { $res.ContentType = "application/octet-stream" }
        $bytes = [System.IO.File]::ReadAllBytes($fullPath)
        $res.ContentLength64 = $bytes.Length
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
      }
      else {
        $msg = [System.Text.Encoding]::UTF8.GetBytes("$($res.StatusCode) - $relPath")
        $res.ContentType = "text/plain"
        $res.ContentLength64 = $msg.Length
        $res.OutputStream.Write($msg, 0, $msg.Length)
      }
    }
    catch {
      try { $res.StatusCode = 500 } catch {}
    }
    finally {
      try { $res.OutputStream.Close() } catch {}
    }
  }
}
finally {
  $listener.Stop()
  $listener.Close()
}
