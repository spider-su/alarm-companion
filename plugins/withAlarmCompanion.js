const fs = require('node:fs');
const path = require('node:path');
const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');

const packageName = 'expo.modules.alarmcompanion';
const permissions = [
  'android.permission.SCHEDULE_EXACT_ALARM', 'android.permission.USE_FULL_SCREEN_INTENT',
  'android.permission.FOREGROUND_SERVICE', 'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
  'android.permission.RECEIVE_BOOT_COMPLETED'
];

function withAlarmCompanion(config) {
  config = withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    manifest['uses-permission'] = manifest['uses-permission'] || [];
    for (const name of permissions) if (!manifest['uses-permission'].some((p) => p.$?.['android:name'] === name)) manifest['uses-permission'].push({ $: { 'android:name': name } });
    const app = manifest.application[0];
    app.service = app.service || [];
    app.receiver = app.receiver || [];
    app.activity = app.activity || [];
    const has = (items, name) => items.some((item) => item.$?.['android:name'] === name);
    const serviceName = `${packageName}.AlarmPlaybackService`;
    if (!has(app.service, serviceName)) app.service.push({ $: { 'android:name': serviceName, 'android:exported': 'false', 'android:foregroundServiceType': 'mediaPlayback' } });
    const receiverName = `${packageName}.AlarmReceiver`;
    if (!has(app.receiver, receiverName)) app.receiver.push({ $: { 'android:name': receiverName, 'android:exported': 'false' } });
    const actionName = `${packageName}.AlarmActionReceiver`;
    if (!has(app.receiver, actionName)) app.receiver.push({ $: { 'android:name': actionName, 'android:exported': 'false' } });
    const recoveryName = `${packageName}.AlarmSystemReceiver`;
    if (!has(app.receiver, recoveryName)) app.receiver.push({ $: { 'android:name': recoveryName, 'android:exported': 'true' }, 'intent-filter': [{ action: [
      { $: { 'android:name': 'android.intent.action.BOOT_COMPLETED' } },
      { $: { 'android:name': 'android.intent.action.MY_PACKAGE_REPLACED' } },
      { $: { 'android:name': 'android.intent.action.TIME_SET' } },
      { $: { 'android:name': 'android.intent.action.TIMEZONE_CHANGED' } },
      { $: { 'android:name': 'android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED' } }
    ] }] });
    const activityName = `${packageName}.AlarmActivity`;
    if (!has(app.activity, activityName)) app.activity.push({ $: { 'android:name': activityName, 'android:exported': 'false', 'android:showWhenLocked': 'true', 'android:turnScreenOn': 'true', 'android:launchMode': 'singleTop' } });
    return mod;
  });
  return withDangerousMod(config, ['android', async (mod) => {
    const raw = path.join(mod.modRequest.projectRoot, 'modules/alarm-companion/android/src/main/res/raw');
    fs.mkdirSync(raw, { recursive: true });
    for (const name of ['birds', 'rain', 'ocean', 'stream', 'chime']) fs.copyFileSync(path.join(mod.modRequest.projectRoot, 'assets/sounds', `${name}.wav`), path.join(raw, `ac_${name}.wav`));
    return mod;
  }]);
}

module.exports = withAlarmCompanion;
