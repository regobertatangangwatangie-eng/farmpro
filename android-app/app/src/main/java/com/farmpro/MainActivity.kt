package com.farmpro

import android.os.Bundle
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URL

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val tv = TextView(this)
        tv.text = "FarmPro Android (loading...)"
        setContentView(tv)

        CoroutineScope(Dispatchers.IO).launch {
            val info = fetchInfo()
            withContext(Dispatchers.Main) {
                tv.text = info ?: "Failed to fetch info"
            }
        }
    }

    private fun fetchInfo(): String? {
        return try {
            val url = URL("http://10.0.2.2:3000/api/info") // emulator localhost -> host
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "GET"
            conn.connectTimeout = 3000
            conn.readTimeout = 3000
            conn.inputStream.bufferedReader().use { it.readText() }
        } catch (e: Exception) {
            e.toString()
        }
    }
}
