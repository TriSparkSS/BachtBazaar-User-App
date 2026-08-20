package com.bachatbazaaruser

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class SpeechToTextModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext), RecognitionListener {

  private val mainHandler = Handler(Looper.getMainLooper())
  private var speechRecognizer: SpeechRecognizer? = null
  private var isListening = false

  override fun getName(): String = NAME

  @ReactMethod
  fun isAvailable(promise: Promise) {
    promise.resolve(SpeechRecognizer.isRecognitionAvailable(reactContext))
  }

  @ReactMethod
  fun start(locale: String?, promise: Promise) {
    mainHandler.post {
      try {
        if (!SpeechRecognizer.isRecognitionAvailable(reactContext)) {
          promise.reject("unavailable", "Speech recognition is not available on this device.")
          return@post
        }

        destroyRecognizer()
        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(reactContext).also {
          it.setRecognitionListener(this)
        }

        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
          putExtra(
            RecognizerIntent.EXTRA_LANGUAGE_MODEL,
            RecognizerIntent.LANGUAGE_MODEL_FREE_FORM,
          )
          putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
          putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5)
          val language = locale?.trim().orEmpty()
          if (language.isNotEmpty()) {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, language)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, language)
          }
        }

        isListening = true
        speechRecognizer?.startListening(intent)
        promise.resolve(true)
      } catch (error: Exception) {
        isListening = false
        destroyRecognizer()
        promise.reject("start_failed", error.message, error)
      }
    }
  }

  @ReactMethod
  fun stop(promise: Promise) {
    mainHandler.post {
      try {
        speechRecognizer?.stopListening()
        promise.resolve(true)
      } catch (error: Exception) {
        promise.reject("stop_failed", error.message, error)
      }
    }
  }

  @ReactMethod
  fun cancel(promise: Promise) {
    mainHandler.post {
      try {
        speechRecognizer?.cancel()
        isListening = false
        destroyRecognizer()
        promise.resolve(true)
      } catch (error: Exception) {
        promise.reject("cancel_failed", error.message, error)
      }
    }
  }

  @ReactMethod
  fun destroy(promise: Promise) {
    mainHandler.post {
      isListening = false
      destroyRecognizer()
      promise.resolve(true)
    }
  }

  @ReactMethod
  fun addListener(eventName: String?) {
    // Required for NativeEventEmitter
  }

  @ReactMethod
  fun removeListeners(count: Int) {
    // Required for NativeEventEmitter
  }

  private fun destroyRecognizer() {
    try {
      speechRecognizer?.setRecognitionListener(null)
      speechRecognizer?.destroy()
    } catch (_: Exception) {
      // ignore
    } finally {
      speechRecognizer = null
    }
  }

  private fun sendEvent(eventName: String, params: WritableMap?) {
    if (!reactContext.hasActiveReactInstance()) {
      return
    }
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(eventName, params)
  }

  private fun resultsToArray(results: ArrayList<String>?): WritableArray {
    val array = Arguments.createArray()
    results?.forEach { array.pushString(it) }
    return array
  }

  override fun onReadyForSpeech(params: Bundle?) {
    sendEvent("onSpeechStart", Arguments.createMap())
  }

  override fun onBeginningOfSpeech() {
    // no-op
  }

  override fun onRmsChanged(rmsdB: Float) {
    // no-op
  }

  override fun onBufferReceived(buffer: ByteArray?) {
    // no-op
  }

  override fun onEndOfSpeech() {
    isListening = false
    sendEvent("onSpeechEnd", Arguments.createMap())
  }

  override fun onError(error: Int) {
    isListening = false
    destroyRecognizer()
    val map = Arguments.createMap()
    val errorMap = Arguments.createMap()
    errorMap.putString("code", error.toString())
    errorMap.putString("message", errorMessage(error))
    map.putMap("error", errorMap)
    sendEvent("onSpeechError", map)
  }

  override fun onResults(results: Bundle?) {
    isListening = false
    val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
    val map = Arguments.createMap()
    map.putArray("value", resultsToArray(matches))
    sendEvent("onSpeechResults", map)
    destroyRecognizer()
  }

  override fun onPartialResults(partialResults: Bundle?) {
    val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
    val map = Arguments.createMap()
    map.putArray("value", resultsToArray(matches))
    sendEvent("onSpeechPartialResults", map)
  }

  override fun onEvent(eventType: Int, params: Bundle?) {
    // no-op
  }

  private fun errorMessage(error: Int): String =
    when (error) {
      SpeechRecognizer.ERROR_AUDIO -> "Audio recording error"
      SpeechRecognizer.ERROR_CLIENT -> "Speech client error"
      SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Microphone permission denied"
      SpeechRecognizer.ERROR_NETWORK -> "Network error"
      SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Network timeout"
      SpeechRecognizer.ERROR_NO_MATCH -> "No speech match"
      SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "Recognizer busy"
      SpeechRecognizer.ERROR_SERVER -> "Speech server error"
      SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "No speech input"
      else -> "Speech recognition error ($error)"
    }

  companion object {
    const val NAME = "SpeechToText"
  }
}
