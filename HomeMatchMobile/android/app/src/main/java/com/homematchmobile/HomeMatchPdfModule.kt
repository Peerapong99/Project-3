package com.homematchmobile

import android.content.Context
import android.os.Bundle
import android.os.CancellationSignal
import android.os.Handler
import android.os.Looper
import android.os.ParcelFileDescriptor
import android.print.PageRange
import android.print.PrintAttributes
import android.print.PrintDocumentAdapter
import android.print.PrintManager
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.ByteArrayInputStream

class HomeMatchPdfModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "HomeMatchPdf"
  private val handler = Handler(Looper.getMainLooper())
  private var printView: WebView? = null
  private var pending: Promise? = null
  private var timeout: Runnable? = null

  private fun cleanup() {
    timeout?.let { handler.removeCallbacks(it) }
    timeout = null
    printView?.destroy()
    printView = null
    pending = null
  }

  @ReactMethod
  fun printHtml(html: String, title: String, promise: Promise) {
    handler.post {
      if (printView != null) { promise.reject("PDF_BUSY", "มีการส่งออก PDF อยู่ กรุณาปิดหน้าพิมพ์เดิมก่อน"); return@post }
      val activity = reactApplicationContext.currentActivity
      if (activity == null || activity.isFinishing) { promise.reject("NO_ACTIVITY", "ไม่พบหน้าจอ Android ที่ใช้งานอยู่"); return@post }
      if (html.length > 2_000_000) { promise.reject("PDF_TOO_LARGE", "เอกสารมีขนาดใหญ่เกินไป"); return@post }
      try {
        pending = promise
        val view = WebView(activity)
        printView = view
        view.settings.javaScriptEnabled = false
        view.settings.allowFileAccess = false
        view.settings.allowContentAccess = false
        view.settings.blockNetworkLoads = true
        var started = false
        view.webViewClient = object : WebViewClient() {
          // Only bundled, allowlisted illustrations can be requested by the HTML.
          override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
            // loadDataWithBaseURL supplies the main document as an inline data URL.
            if (request.isForMainFrame && request.url.scheme == "data") return null
            val name = request.url.lastPathSegment
            val allowed = setOf("Bed.png", "Sofa.png", "Table.png", "Cabinet.png", "TV.png", "Plant.png", "Toilet.png", "Sink.png", "Bathtub.png")
            if (request.url.toString().startsWith("https://homematch.invalid/") && name in allowed) {
              return try { WebResourceResponse("image/png", null, reactApplicationContext.assets.open(name!!)) }
              catch (error: Exception) { WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", emptyMap(), ByteArrayInputStream(byteArrayOf())) }
            }
            return WebResourceResponse("text/plain", "UTF-8", 403, "Forbidden", emptyMap(), ByteArrayInputStream(byteArrayOf()))
          }
          override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest) = true
          override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
            if (!request.isForMainFrame && request.url.lastPathSegment?.endsWith(".png") != true) return
            handler.post { pending?.reject("PDF_RENDER_ERROR", "โหลดข้อมูลเอกสารไม่สำเร็จ"); cleanup() }
          }
          override fun onReceivedHttpError(view: WebView, request: WebResourceRequest, response: WebResourceResponse) {
            // Chromium may request a favicon; only missing document images are fatal.
            if (!request.isForMainFrame && request.url.lastPathSegment?.endsWith(".png") != true) return
            android.util.Log.w("HomeMatchPdf", "Image request failed: ${request.url.lastPathSegment}")
            handler.post { pending?.reject("PDF_ASSET_ERROR", "โหลดภาพประกอบ PDF ไม่สำเร็จ"); cleanup() }
          }
          override fun onPageFinished(view: WebView, url: String) {
            if (started || printView !== view) return
            started = true
            timeout?.let { handler.removeCallbacks(it) }
            timeout = null
            try {
              val manager = activity.getSystemService(Context.PRINT_SERVICE) as? PrintManager
                ?: throw IllegalStateException("ไม่พบระบบพิมพ์ของ Android")
              val delegate = view.createPrintDocumentAdapter(title)
              val adapter = object : PrintDocumentAdapter() {
                override fun onStart() { delegate.onStart() }
                override fun onLayout(oldAttributes: PrintAttributes?, newAttributes: PrintAttributes?, cancellationSignal: CancellationSignal?, callback: LayoutResultCallback?, extras: Bundle?) {
                  delegate.onLayout(oldAttributes, newAttributes, cancellationSignal, callback, extras)
                }
                override fun onWrite(pages: Array<out PageRange>?, destination: ParcelFileDescriptor?, cancellationSignal: CancellationSignal?, callback: WriteResultCallback?) {
                  delegate.onWrite(pages, destination, cancellationSignal, callback)
                }
                override fun onFinish() { try { delegate.onFinish() } finally { cleanup() } }
              }
              manager.print(title, adapter, PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).setColorMode(PrintAttributes.COLOR_MODE_COLOR).build())
              pending?.resolve("print_dialog_opened")
              pending = null
            } catch (error: Exception) { pending?.reject("PDF_PRINT_ERROR", error.message, error); cleanup() }
          }
        }
        val abort = Runnable { pending?.reject("PDF_TIMEOUT", "เตรียมเอกสารไม่สำเร็จ กรุณาลองใหม่"); cleanup() }
        timeout = abort
        handler.postDelayed(abort, 30_000)
        view.loadDataWithBaseURL("https://homematch.invalid/", html, "text/html", "UTF-8", null)
      } catch (error: Exception) { promise.reject("PDF_INIT_ERROR", error.message, error); cleanup() }
    }
  }
  override fun invalidate() {
    handler.post { pending?.reject("PDF_CLOSED", "แอปปิดระหว่างเตรียม PDF"); cleanup() }
    super.invalidate()
  }
}