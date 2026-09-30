plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("kotlin-parcelize")
}
android { namespace="com.freezzz.platform"; compileSdk=36
    defaultConfig { applicationId="com.freezzz.platform"; minSdk=26; targetSdk=36; versionCode=1; versionName="0.1.0" }
    buildFeatures { buildConfig = true }
}
