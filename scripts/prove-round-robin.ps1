$ErrorActionPreference = "Stop"

$baseUrl = $args[0]
if (-not $baseUrl) {
  $baseUrl = "http://127.0.0.1:8080"
}

$servedBy = 1..15 | ForEach-Object {
  $response = Invoke-RestMethod "$baseUrl/api/status"
  [PSCustomObject]@{
    Request = $_
    ServedBy = $response.servedBy
  }
}

$servedBy | Format-Table -AutoSize

$firstRound = $servedBy[0..4].ServedBy -join ","
$secondRound = $servedBy[5..9].ServedBy -join ","
$thirdRound = $servedBy[10..14].ServedBy -join ","

if ($firstRound -ne $secondRound -or $firstRound -ne $thirdRound) {
  throw "Round-robin proof failed: three 5-request rounds are not identical."
}

$uniqueNodes = @($servedBy.ServedBy | Sort-Object -Unique)
if ($uniqueNodes.Count -lt 3) {
  throw "Round-robin proof failed: expected at least 3 unique nodes, got $($uniqueNodes.Count)."
}

"Round-robin proof passed: $($uniqueNodes.Count) unique nodes, same order repeated 3 times."
