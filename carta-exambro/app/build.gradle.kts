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

android {
    namespace = "id.sch.sman1campurdarat.cartaexambro"
    compileSdk = 35

    defaultConfig {
        applicationId = "id.sch.sman1campurdarat.cartaexambro"
        minSdk = 24
        targetSdk = 35
        versionCode = 2
        versionName = "1.1.0"

        // URL default server CartaExam & domain SSO PortoCarta yang diizinkan
        buildConfigField("String", "DEFAULT_EXAM_URL", "\"https://exam.sman1campurdarat.sch.id\"")
        buildConfigField("String", "SSO_DOMAIN", "\"porto.sman1campurdarat.sch.id\"")
        buildConfigField("String", "EXAM_DOMAIN", "\"exam.sman1campurdarat.sch.id\"")
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
