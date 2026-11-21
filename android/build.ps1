$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (!$env:JAVA_HOME -or !$env:ANDROID_SDK_ROOT) { throw '请先设置 JAVA_HOME 和 ANDROID_SDK_ROOT。' }
$jdk = Join-Path $env:JAVA_HOME 'bin'
$tool = Join-Path $env:ANDROID_SDK_ROOT 'build-tools/35.0.0'
$platform = Join-Path $env:ANDROID_SDK_ROOT 'platforms/android-35/android.jar'
$jarPath = Join-Path $env:TEMP 'guessing-android-api35.jar'
Copy-Item -LiteralPath $platform -Destination $jarPath -Force
New-Item -ItemType Directory -Force -Path 'out/classes','out/dex' | Out-Null
& "$tool/aapt.exe" package -f -M 'AndroidManifest.xml' -S 'res' -A 'assets' -I $jarPath -F 'out/unsigned.apk'
if ($LASTEXITCODE -ne 0) { throw '资源打包失败' }
& "$jdk/javac.exe" -encoding UTF-8 -source 8 -target 8 -classpath $jarPath -d 'out/classes' 'src/com/huanglin1008/guessing/MainActivity.java' 'src/com/huanglin1008/guessing/LanBridge.java'
if ($LASTEXITCODE -ne 0) { throw 'Java 编译失败' }
$classes = Get-ChildItem 'out/classes/com/huanglin1008/guessing' -Filter '*.class' | ForEach-Object { $_.FullName }
& "$jdk/java.exe" -cp "$tool/lib/d8.jar" com.android.tools.r8.D8 --min-api 23 --lib $jarPath --output 'out/dex' $classes
if ($LASTEXITCODE -ne 0) { throw 'Dex 编译失败' }
& "$jdk/jar.exe" uf 'out/unsigned.apk' -C 'out/dex' 'classes.dex'
if ($LASTEXITCODE -ne 0) { throw 'Dex 打包失败' }
& "$tool/zipalign.exe" -f 4 'out/unsigned.apk' 'out/aligned-unsigned.apk'
if ($LASTEXITCODE -ne 0) { throw 'APK 对齐失败' }
Write-Output '已生成 out/aligned-unsigned.apk；签名后才可安装。'
