// The Android APK is hosted on Google Drive for now (free, no extra infra).
// Google's "uc?export=download" form is the standard direct-download link
// for a shared file — clicking it prompts Drive's normal virus-scan
// interstitial with a "Download anyway" button, which is expected browser
// behavior for any Drive-hosted file, not a bug.
//
// If this ever needs a cleaner one-click download (no interstitial), the
// straightforward upgrade is hosting the .apk as a GitHub Release asset
// instead — same free cost, but a direct link with no warning page.
const ANDROID_APK_DRIVE_FILE_ID = "1GsPBvTOivNHYPrdSOEXd48BKI08We2UW";

export const ANDROID_APK_DOWNLOAD_URL = `https://drive.google.com/uc?export=download&id=${ANDROID_APK_DRIVE_FILE_ID}`;
