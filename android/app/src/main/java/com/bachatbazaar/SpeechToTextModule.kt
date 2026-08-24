package com.bachatbazaaruser

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * Launches the system speech dialog (Speak now) and returns the transcript.
 */
class SpeechToTextModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  private var isListening = false

  private val activityEventListener: ActivityEventListener =
    object : BaseActivityEventListener() {
      override fun onActivityResult(
        activity: Activity,
        requestCode: Int,
        resultCode: Int,
        data: Intent?,
      ) {
        if (requestCode != REQUEST_CODE) {
          return
        }

        isListening = false

        if (resultCode == Activity.RESULT_OK && data != null) {
          val matches = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
          val map = Arguments.createMap()
          map.putArray("value", resultsToArray(matches))
          sendEvent("onSpeechResults", map)
          sendEvent("onSpeechEnd", Arguments.createMap())
          return
        }

        // User cancelled or no result
        val map = Arguments.createMap()
        val errorMap = Arguments.createMap()
        errorMap.putString("code", "6")
        errorMap.putString("message", "Speech input cancelled")
        map.putMap("error", errorMap)
        sendEvent("onSpeechError", map)
        sendEvent("onSpeechEnd", Arguments.createMap())
      }
    }

  init {
    reactContext.addActivityEventListener(activityEventListener)
  }

  override fun getName(): String = NAME

  @ReactMethod
  fun isAvailable(promise: Promise) {
    promise.resolve(SpeechRecognizer.isRecognitionAvailable(reactContext))
  }

  @ReactMethod
  fun start(locale: String?, promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.reject("no_activity", "No active activity for speech recognition.")
      return
    }

    if (isListening) {
      promise.resolve(true)
      return
    }

    val intent =
      Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
        putExtra(
          RecognizerIntent.EXTRA_LANGUAGE_MODEL,
          RecognizerIntent.LANGUAGE_MODEL_FREE_FORM,
        )
        putExtra(RecognizerIntent.EXTRA_PROMPT, "Speak now…")
        putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5)
        putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
        val language = locale?.trim().orEmpty()
        if (language.isNotEmpty()) {
          putExtra(RecognizerIntent.EXTRA_LANGUAGE, language)
          putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, language)
        }
      }

    try {
      isListening = true
      sendEvent("onSpeechStart", Arguments.createMap())
      @Suppress("DEPRECATION")
      activity.startActivityForResult(intent, REQUEST_CODE)
      promise.resolve(true)
    } catch (error: ActivityNotFoundException) {
      isListening = false
      promise.reject(
        "unavailable",
        "No speech recognition app found. Install Google app / speech services.",
        error,
      )
    } catch (error: Exception) {
      isListening = false
      promise.reject("start_failed", error.message, error)
    }
  }

  @ReactMethod
  fun stop(promise: Promise) {
    // System dialog manages its own lifecycle.
    isListening = false
    promise.resolve(true)
  }

  @ReactMethod
  fun cancel(promise: Promise) {
    isListening = false
    promise.resolve(true)
  }

  @ReactMethod
  fun destroy(promise: Promise) {
    isListening = false
    promise.resolve(true)
  }

  @ReactMethod
  fun addListener(eventName: String?) {
    // Required for NativeEventEmitter
  }

  @ReactMethod
  fun removeListeners(count: Int) {
    // Required for NativeEventEmitter
  }

  private fun resultsToArray(results: ArrayList<String>?): WritableArray {
    val array = Arguments.createArray()
    results?.forEach { array.pushString(it) }
    return array
  }

  private fun sendEvent(eventName: String, params: WritableMap?) {
    if (!reactContext.hasActiveReactInstance()) {
      return
    }
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(eventName, params)
  }

  companion object {
    const val NAME = "SpeechToText"
    private const val REQUEST_CODE = 9911
  }
}
