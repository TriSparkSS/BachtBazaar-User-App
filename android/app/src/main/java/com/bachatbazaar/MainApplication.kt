package com.bachatbazaaruser

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList = PackageList(this).packages,
      // Temporarily force embedded bundle so wishlist parser fixes ship in the APK.
      // Set useDevSupport = BuildConfig.DEBUG when you want live Metro again.
      useDevSupport = false,
      jsBundleAssetPath = "index.android.bundle",
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
  }
}
