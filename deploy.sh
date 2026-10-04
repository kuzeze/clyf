#!/bin/zsh
# Push the CLYF sleeve app to a USB-connected UNO Q, (re)start it, and forward its
# web UI to http://localhost:7700 on this Mac. Everything runs over the USB cable
# (ADB), so no Wi-Fi is involved and campus network isolation does not matter.
#
# Safety: while electrodes are on skin, the Mac must run on battery (charger unplugged).
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
adb="${ADB:-$(command -v adb || echo "$HOME/Library/Android/sdk/platform-tools/adb")}"
remote=/home/arduino/ArduinoApps/clyf-sleeve

"$adb" get-state >/dev/null || { print 'UNO Q 没有通过 USB 连上（adb devices 里没有设备）'; exit 1; }
"$adb" shell "mkdir -p $remote && rm -rf $remote/assets $remote/python $remote/sketch/sketch.ino"
"$adb" push "$here/app/app.yaml" "$here/app/sketch" "$here/app/python" "$here/app/assets" "$remote/" >/dev/null
print '已上传，正在编译 sketch 并启动 App（第一次可能要一两分钟）…'
# adb's shell exports TMPDIR=/data/local/tmp (an Android path) which does not exist on the UNO Q.
"$adb" shell "export TMPDIR=/tmp; arduino-app-cli app stop user:clyf-sleeve >/dev/null 2>&1; arduino-app-cli app start user:clyf-sleeve"
# Local 7700, not 7000: macOS AirPlay Receiver already listens on 7000 and answers 403.
"$adb" forward tcp:7700 tcp:7000 >/dev/null
print '打开 http://localhost:7700'
print '查看 Python 日志：'"$adb"' shell arduino-app-cli app logs user:clyf-sleeve'
