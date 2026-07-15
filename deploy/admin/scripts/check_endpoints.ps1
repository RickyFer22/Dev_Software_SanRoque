$endpoints = @('/admin/api/session','/admin/api/users','/admin/api/alojamientos','/admin/api/gastronomia','/admin/api/eventos','/admin/api/datos-utiles','/admin/api/audit','/admin/api/reviews','/admin/api/uploads','/admin/api/backup')
foreach($ep in $endpoints){
  try{
    $r = Invoke-WebRequest -Uri ("http://127.0.0.1:4000" + $ep) -UseBasicParsing -TimeoutSec 5 -Method GET
    Write-Output ("$($r.StatusCode) $ep")
  } catch {
    if ($_.Exception.Response -ne $null) {
      $code = $_.Exception.Response.StatusCode.value__
      Write-Output ("$code $ep")
    } else {
      Write-Output ("ERROR $ep: $($_.Exception.Message)")
    }
  }
}
