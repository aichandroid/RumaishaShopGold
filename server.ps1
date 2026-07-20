# Simple PowerShell Static File Web Server
# Serves the Rumaisho Gold App files on http://localhost:8080

$port = 8080
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
    Write-Host "PowerShell Web Server started successfully!"
    Write-Host "Serving files on http://localhost:$port/"
    Write-Host "Press Ctrl+C or kill task to stop."

    while ($listener.IsListening) {
        try {
            $context = $listener.GetContext()
            $request = $context.Request
            $response = $context.Response

            $urlPath = $request.Url.LocalPath
            if ($urlPath -eq "/") {
                $urlPath = "/index.html"
            }

            # Normalize path
            $cleanPath = $urlPath.Replace("/", "\").TrimStart('\')
            $filePath = Join-Path "C:\Users\aicha\.gemini\antigravity\scratch\rumaisho-shop" $cleanPath

            if (Test-Path $filePath -PathType Leaf) {
                $bytes = [System.IO.File]::ReadAllBytes($filePath)

                # Content-Type Header
                if ($filePath.EndsWith(".html")) {
                    $response.ContentType = "text/html; charset=utf-8"
                } elseif ($filePath.EndsWith(".css")) {
                    $response.ContentType = "text/css; charset=utf-8"
                } elseif ($filePath.EndsWith(".js")) {
                    $response.ContentType = "application/javascript; charset=utf-8"
                } elseif ($filePath.EndsWith(".jpg") -or $filePath.EndsWith(".jpeg")) {
                    $response.ContentType = "image/jpeg"
                } elseif ($filePath.EndsWith(".png")) {
                    $response.ContentType = "image/png"
                }

                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $response.StatusCode = 404
                $response.ContentType = "text/plain"
                $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
                $response.OutputStream.Write($msg, 0, $msg.Length)
            }
            $response.Close()
        } catch {
            Write-Warning $_.Exception.Message
        }
    }
} catch {
    Write-Error "Failed to start listener: $_"
} finally {
    if ($listener.IsListening) {
        $listener.Stop()
    }
}
