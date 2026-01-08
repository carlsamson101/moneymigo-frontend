import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { removeToken, getToken } from '../../lib/auth';


const IDLE_TIMEOUT = Platform.OS === 'web'
  ? 10 * 60 * 1000   // 10 minutes for web
  : 5 * 60 * 1000;   // 5 minutes for app


export function useIdleLogout() {
  const router = useRouter();
  const pathname = usePathname();
  const lastActiveRef = useRef(Date.now());
  const timeoutIdRef = useRef(null);


  // ✅ Don't run idle logout on public pages
  const isPublicRoute = pathname === '/login' || pathname === '/register' || pathname === '/';


  useEffect(() => {
    if (isPublicRoute) {
      console.log('⏭️ Skipping idle logout on public route:', pathname);
      return;
    }


    // 📱 NATIVE: Use AppState (original logic - works perfectly!)
    if (Platform.OS !== 'web') {
      const handleAppStateChange = async (nextAppState) => {
        console.log('App state changed:', nextAppState);


        if (nextAppState === 'background') {
          lastActiveRef.current = Date.now();
          console.log('App backgrounded at', lastActiveRef.current);
        }
       
        if (nextAppState === 'active') {
          const now = Date.now();
          const idleTime = now - lastActiveRef.current;
          const seconds = idleTime / 1000;
          console.log('App resumed after', seconds, 'seconds');
         
          // ✅ Check if user is still logged in before logging out
          const token = await getToken();
          if (!token) {
            console.log('⏭️ User already logged out, skipping idle check');
            return;
          }
         
          if (idleTime > IDLE_TIMEOUT) {
            console.log('⏱️ Logging out due to inactivity!');
            await removeToken();
            router.replace('/login');
          }
        }
      };


      const subscription = AppState.addEventListener('change', handleAppStateChange);
      return () => subscription.remove();
    }
   
    // 🌐 WEB: Use activity listeners (AppState doesn't work on web)
    else {
      const resetTimer = () => {
        lastActiveRef.current = Date.now();
       
        // Clear existing timeout
        if (timeoutIdRef.current) {
          clearTimeout(timeoutIdRef.current);
        }


        // Set new timeout
        timeoutIdRef.current = setTimeout(async () => {
          console.log('⏱️ Web idle timeout reached after', IDLE_TIMEOUT / 1000, 'seconds');
         
          // ✅ Double-check user is still logged in
          const token = await getToken();
          if (token) {
            console.log('Logging out due to web inactivity!');
            await removeToken();
            router.replace('/login');
          } else {
            console.log('⏭️ User already logged out, skipping');
          }
        }, IDLE_TIMEOUT);
      };


      // Activity events for web
      const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click', 'mousemove'];
     
      // Add listeners
      events.forEach(event => {
        window.addEventListener(event, resetTimer, { passive: true });
      });


      // Start initial timer
      resetTimer();
      console.log('⏱️ Web idle timer started');


      // Cleanup
      return () => {
        events.forEach(event => {
          window.removeEventListener(event, resetTimer);
        });
        if (timeoutIdRef.current) {
          clearTimeout(timeoutIdRef.current);
          console.log('🧹 Web idle timer cleaned up');
        }
      };
    }
  }, [pathname, isPublicRoute, router]);
}

