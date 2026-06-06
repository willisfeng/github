# 创建 Windows 定时任务：每天凌晨 2 点运行 fetch.js
# 以管理员身份运行此脚本

$taskName = "GitHubTrendingFetcher"
$scriptPath = "c:\Users\Bigf\Downloads\github\fetch.js"
$workingDir = "c:\Users\Bigf\Downloads\github"

# 删除旧任务（如果存在）
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

# 创建新任务
$action = New-ScheduledTaskAction -Execute "node" -Argument "`"$scriptPath`"" -WorkingDirectory $workingDir
$trigger = New-ScheduledTaskTrigger -Daily -At "02:00"
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "GitHub 热门仓库数据每日抓取"

Write-Host "定时任务已创建：每天凌晨 2:00 运行 fetch.js" -ForegroundColor Green
Write-Host "任务名称：$taskName" -ForegroundColor Cyan
Write-Host "可以在「任务计划程序」中查看和管理此任务" -ForegroundColor Yellow
