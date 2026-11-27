import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val keystorePropertiesFile = rootProject.file("keystore.properties")
val keystoreProperties = Properties()
val hasReleaseKeystore = keystorePropertiesFile.exists().also { exists ->
    if (exists) {
        keystorePropertiesFile.inputStream().use { keystoreProperties.load(it) }
    }
}

val exambroConfigFile = rootProject.file("exambro-config.properties")
val exambroConfig = Properties()
if (exambroConfigFile.exists()) {
    exambroConfigFile.inputStream().use { exambroConfig.load(it) }
}

fun cfgString(key: String, fallback: String = ""): String {
    return (exambroConfig.getProperty(key) ?: fallback).trim()
}

fun escapeBuildConfig(value: String): String {
    return value.replace("\\", "\\\\").replace("\"", "\\\"")
}

val configuredAppId = cfgString("applicationId", "org.cartaexam.exambro").ifBlank { "org.cartaexam.exambro" }
val configuredSchoolName = cfgString("schoolName", "Platform Ujian Digital")
val configuredDefaultExamUrl = cfgString("defaultExamUrl", "")
val configuredExamDomain = cfgString("examDomain", "")
val configuredSsoDomain = cfgString("ssoDomain", "")
val configuredDefaultExitPin = cfgString("defaultProctorExitPin", "CARTA2026").ifBlank { "CARTA2026" }

android {
    namespace = "id.sch.sman1campurdarat.cartaexambro"
    compileSdk = 35

    defaultConfig {
        applicationId = configuredAppId
        minSdk = 24
        targetSdk = 35
        versionCode = 2
        versionName = "1.1.0"

        // Konfigurasi server & branding (otomatis membaca exambro-config.properties jika ada)
        buildConfigField("String", "SCHOOL_NAME", "\"${escapeBuildConfig(configuredSchoolName)}\"")
        buildConfigField("String", "DEFAULT_EXAM_URL", "\"${escapeBuildConfig(configuredDefaultExamUrl)}\"")
        buildConfigField("String", "SSO_DOMAIN", "\"${escapeBuildConfig(configuredSsoDomain)}\"")
        buildConfigField("String", "EXAM_DOMAIN", "\"${escapeBuildConfig(configuredExamDomain)}\"")
        buildConfigField("String", "DEFAULT_PROCTOR_EXIT_PIN", "\"${escapeBuildConfig(configuredDefaultExitPin)}\"")
    }

    signingConfigs {
        if (hasReleaseKeystore) {
            create("release") {
                storeFile = rootProject.file(keystoreProperties.getProperty("storeFile"))
                storePassword = keystoreProperties.getProperty("storePassword")
                keyAlias = keystoreProperties.getProperty("keyAlias")
                keyPassword = keystoreProperties.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            if (hasReleaseKeystore) {
                signingConfig = signingConfigs.getByName("release")
            }
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        debug {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        buildConfig = true
        viewBinding = true
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("androidx.webkit:webkit:1.12.1")

    // Scanner QR offline ringan (tanpa ketergantungan Google Play Services)
    implementation("com.journeyapps:zxing-android-embedded:4.3.0") {
        isTransitive = true
    }
}
