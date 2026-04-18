# Keystore para release Android (es.pidoo.app)

El keystore NO está en git. Hay que generarlo y configurarlo manualmente antes de generar el AAB de release.

## 1. Generar el keystore

```bash
cd pido-app/android/app
keytool -genkey -v \
  -keystore pidoo-apk.jks \
  -alias pidoo \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Te pedirá:
- Contraseña del keystore (RELEASE_STORE_PASSWORD)
- Contraseña del alias (RELEASE_KEY_PASSWORD) — usar la misma para simplificar
- Nombre, organización, ciudad, país (puedes poner: Marlon Rodelo / Rogotech / Santa Cruz de Tenerife / ES)

Resultado: `pido-app/android/app/pidoo-apk.jks`. Está en `.gitignore`.

## 2. Crear `android/keystore.properties`

```properties
RELEASE_STORE_FILE=pidoo-apk.jks
RELEASE_STORE_PASSWORD=<tu-password>
RELEASE_KEY_ALIAS=pidoo
RELEASE_KEY_PASSWORD=<tu-password>
```

También en `.gitignore`. **NUNCA commit.**

## 3. Configurar `android/app/build.gradle`

Dentro del bloque `android { ... }`:

```gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

signingConfigs {
    release {
        if (keystorePropertiesFile.exists()) {
            storeFile file(keystoreProperties['RELEASE_STORE_FILE'])
            storePassword keystoreProperties['RELEASE_STORE_PASSWORD']
            keyAlias keystoreProperties['RELEASE_KEY_ALIAS']
            keyPassword keystoreProperties['RELEASE_KEY_PASSWORD']
        }
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
    }
}
```

## 4. Backup

- Guarda `pidoo-apk.jks` + las contraseñas en un sitio seguro (1Password, Bitwarden, KeePass).
- **Si pierdes el keystore no podrás volver a publicar actualizaciones de la app en Google Play.**
- Considera activar Play App Signing en Google Play Console (Google guarda la clave de firma maestra y tú firmas con una upload key — más seguro ante pérdida).

## 5. Generar AAB de release

```bash
npm run build
npx cap sync android
cd android
./gradlew bundleRelease
```

Salida: `android/app/build/outputs/bundle/release/app-release.aab`
