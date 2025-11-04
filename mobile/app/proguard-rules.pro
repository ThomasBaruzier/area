-keepattributes Signature

-keep public class * extends kotlin.coroutines.jvm.internal.BaseContinuationImpl
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.android.AndroidExceptionPreHandler {}
-keepclassmembers class kotlinx.coroutines.android.AndroidDispatcherFactory {
    private static final java.lang.Object base;
}
-keepclassmembers class kotlinx.coroutines.internal.MainDispatcherFactory {
    private static final java.lang.Object Main;
}

-keepclassmembers,allowshrinking,allowobfuscation class * extends kotlinx.coroutines.flow.internal.SafeCollector {
    public java.lang.Object J$0;
    public int I$0;
    public java.lang.Object L$0;
    public java.lang.Object U$0;
    public java.lang.Object V$0;
    public java.lang.Object W$0;
    public java.lang.Object X$0;
    public java.lang.Object Y$0;
    public java.lang.Object Z$0;
}

-keep class kotlinx.serialization.internal.*
-keep class *$$serializer
-keepclassmembers class * {
    @kotlinx.serialization.Serializable <methods>;
    @kotlinx.serialization.SerialName <methods>;
    kotlinx.serialization.KSerializer serializer(...);
}

-dontwarn retrofit2.Platform$Java8
-keepattributes InnerClasses
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-dontwarn okio.**
-keep class retrofit2.** { *; }
-keep interface retrofit2.** { *; }
-keepclassmembers class * {
    @retrofit2.http.* <methods>;
}

-dontwarn com.google.errorprone.annotations.**
