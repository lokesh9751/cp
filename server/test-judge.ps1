$ErrorActionPreference = "Stop"

$BaseUrl = "http://localhost:4000"
$Email = "dio75611@gmail.com"
$Password = "lokesh123"

Write-Host "`n=== 1. Checking Health & Fetching First Problem ===" -ForegroundColor Cyan
$health = Invoke-RestMethod -Uri "$BaseUrl/api/health"
$health | Format-Table

$problemsRes = Invoke-RestMethod -Uri "$BaseUrl/api/problems"
$slug = $problemsRes.problems[0].slug
Write-Host "Using Problem Slug: $slug" -ForegroundColor Green

Write-Host "`n=== 2. Checking Problem Detail (Sample Test Cases Only) ===" -ForegroundColor Cyan
$detail = Invoke-RestMethod -Uri "$BaseUrl/api/problems/$slug"
Write-Host "Title: $($detail.problem.title)"
Write-Host "Sample Test Cases Count: $($detail.problem.sampleTestCases.Count) (Expected: 2)"

Write-Host "`n=== 3. Logging In ===" -ForegroundColor Cyan
$loginBody = @{
    identifier = $Email
    password   = $Password
} | ConvertTo-Json

$loginRes = Invoke-RestMethod `
    -Uri "$BaseUrl/api/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $loginBody `
    -SessionVariable authSession

$headers = @{}
if ($loginRes.accessToken) {
    $headers["Authorization"] = "Bearer $($loginRes.accessToken)"
}
elseif ($loginRes.token) {
    $headers["Authorization"] = "Bearer $($loginRes.token)"
}
Write-Host "Login successful!" -ForegroundColor Green

$cppCode = @'
#include <iostream>
using namespace std;
int main() {
    long long a, b;
    if (cin >> a >> b) {
        cout << (a + b) << "\n";
    }
    return 0;
}
'@

Write-Host "`n=== 4A. Testing RUN (Sample Test Cases via Judge0) ===" -ForegroundColor Cyan
$runSampleBody = @{
    slug     = $slug
    language = "cpp"
    code     = $cppCode
} | ConvertTo-Json

$sampleRes = Invoke-RestMethod `
    -Uri "$BaseUrl/api/submissions/run" `
    -Method POST `
    -ContentType "application/json" `
    -Headers $headers `
    -WebSession $authSession `
    -Body $runSampleBody

$sampleRes | ConvertTo-Json -Depth 5

Write-Host "`n=== 4B. Testing RUN (Custom Input + Reference Code Match) ===" -ForegroundColor Cyan
$runCustomBody = @{
    slug        = $slug
    language    = "cpp"
    customInput = "12 30`n"
    code        = $cppCode
} | ConvertTo-Json

$customRes = Invoke-RestMethod `
    -Uri "$BaseUrl/api/submissions/run" `
    -Method POST `
    -ContentType "application/json" `
    -Headers $headers `
    -WebSession $authSession `
    -Body $runCustomBody

$customRes | ConvertTo-Json -Depth 5

Write-Host "`n=== 4C. Testing SUBMIT (All Sample + Hidden Cases + DB Save) ===" -ForegroundColor Cyan
$submitRes = Invoke-RestMethod `
    -Uri "$BaseUrl/api/submissions" `
    -Method POST `
    -ContentType "application/json" `
    -Headers $headers `
    -WebSession $authSession `
    -Body $runSampleBody

$submitRes | ConvertTo-Json -Depth 5

$subId = $submitRes.submission.id

Write-Host "`n=== 4D. Fetching Saved Submission #$subId & History ===" -ForegroundColor Cyan
Invoke-RestMethod -Uri "$BaseUrl/api/submissions/$subId" -Headers $headers -WebSession $authSession | ConvertTo-Json -Depth 4
Invoke-RestMethod -Uri "$BaseUrl/api/submissions/problem/$slug" -Headers $headers -WebSession $authSession | ConvertTo-Json -Depth 4

Write-Host "`nALL CHECKS COMPLETED!" -ForegroundColor Green