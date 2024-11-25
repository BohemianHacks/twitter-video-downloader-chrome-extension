$urls = @{
    "icon16.png" = "https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/2b07.png"
    "icon48.png" = "https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/2b07.png"
    "icon128.png" = "https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/2b07.png"
}

foreach ($icon in $urls.Keys) {
    $outputPath = Join-Path -Path "icons" -ChildPath $icon
    Invoke-WebRequest -Uri $urls[$icon] -OutFile $outputPath
    Write-Host "Downloaded $icon"
}
