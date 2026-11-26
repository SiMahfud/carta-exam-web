# Keep @JavascriptInterface methods for CartaExambroBridge
-keepattributes *Annotation*
-keepclassmembers class id.sch.sman1campurdarat.cartaexambro.ExamWebBridge {
    @android.webkit.JavascriptInterface <methods>;
}
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
