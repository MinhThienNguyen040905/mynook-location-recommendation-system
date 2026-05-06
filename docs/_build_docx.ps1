param(
    [string]$HtmlPath = (Join-Path $PSScriptRoot "_source.html"),
    [string]$DocxPath = (Join-Path $PSScriptRoot "MyNook_Search_Recommendation.docx")
)

$ErrorActionPreference = "Stop"
$word = New-Object -ComObject Word.Application
$word.Visible = $false
try {
    $doc = $word.Documents.Open($HtmlPath, $false, $true)  # readOnly=$true so Word doesn't lock html
    # 16 = wdFormatDocumentDefault (.docx)
    $doc.SaveAs([ref]$DocxPath, [ref]16)
    $doc.Close($false)
    Write-Output "Saved: $DocxPath"
} finally {
    $word.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
}
