package com.homematchmobile
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
class HomeMatchConfigModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "HomeMatchConfig"
  override fun getConstants(): MutableMap<String, Any> = mutableMapOf("apiOrigin" to BuildConfig.HOMEMATCH_API_ORIGIN)
}
