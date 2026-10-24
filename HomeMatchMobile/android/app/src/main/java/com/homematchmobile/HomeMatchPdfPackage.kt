package com.homematchmobile

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class HomeMatchPdfPackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
    when (name) {
      "HomeMatchPdf" -> HomeMatchPdfModule(reactContext)
      "HomeMatchConfig" -> HomeMatchConfigModule(reactContext)
      else -> null
    }
  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    mapOf(
      "HomeMatchPdf" to ReactModuleInfo("HomeMatchPdf", HomeMatchPdfModule::class.java.name, false, false, false, false),
      "HomeMatchConfig" to ReactModuleInfo("HomeMatchConfig", HomeMatchConfigModule::class.java.name, false, false, false, false)
    )
  }
}