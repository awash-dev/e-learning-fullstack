// app/components/VideoPlayer.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { type Lesson } from '@/services/api';

const { width: screenWidth } = Dimensions.get('window');

interface VideoPlayerProps {
  videoUrl: string | null;
  lesson: Lesson;
  onNext: () => void;
  onPrevious: () => void;
  hasNext: boolean;
  hasPrevious: boolean;
  onProgress?: (progress: number) => void; // Progress callback (0-100)
  onComplete?: () => void; // When video is completed
}

export default function VideoPlayer({
  videoUrl,
  lesson,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
  onProgress,
  onComplete,
}: VideoPlayerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoProgress, setVideoProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, []);

  const handleLoadStart = () => {
    setLoading(true);
    setError(null);
  };

  const handleLoadEnd = () => {
    setLoading(false);
    // Inject JavaScript to track video progress
    injectProgressTracker();
  };

  const handleError = () => {
    setLoading(false);
    setError('Failed to load video. Please check your internet connection.');
  };

  const injectProgressTracker = () => {
    // Inject JavaScript to track YouTube player progress
    const script = `
      (function() {
        let player;
        let progressCheckInterval;
        
        function onYouTubeIframeAPIReady() {
          const iframe = document.querySelector('iframe');
          if (iframe) {
            player = new YT.Player(iframe, {
              events: {
                'onStateChange': onPlayerStateChange,
                'onReady': onPlayerReady
              }
            });
          }
        }
        
        function onPlayerReady(event) {
          checkProgress();
        }
        
        function onPlayerStateChange(event) {
          if (event.data === YT.PlayerState.PLAYING) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'playing' }));
            startProgressTracking();
          } else if (event.data === YT.PlayerState.PAUSED) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'paused' }));
            stopProgressTracking();
          } else if (event.data === YT.PlayerState.ENDED) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ended', progress: 100 }));
            stopProgressTracking();
          }
        }
        
        function startProgressTracking() {
          if (progressCheckInterval) return;
          progressCheckInterval = setInterval(checkProgress, 1000);
        }
        
        function stopProgressTracking() {
          if (progressCheckInterval) {
            clearInterval(progressCheckInterval);
            progressCheckInterval = null;
          }
        }
        
        function checkProgress() {
          if (player && player.getCurrentTime && player.getDuration) {
            const currentTime = player.getCurrentTime();
            const duration = player.getDuration();
            if (duration > 0) {
              const progress = Math.round((currentTime / duration) * 100);
              window.ReactNativeWebView.postMessage(JSON.stringify({ 
                type: 'progress', 
                progress: progress,
                currentTime: currentTime,
                duration: duration
              }));
            }
          }
        }
        
        // Load YouTube IFrame API if not already loaded
        if (typeof YT === 'undefined') {
          const tag = document.createElement('script');
          tag.src = 'https://www.youtube.com/iframe_api';
          const firstScriptTag = document.getElementsByTagName('script')[0];
          firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
          window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
        } else {
          onYouTubeIframeAPIReady();
        }
      })();
      true;
    `;

    webViewRef.current?.injectJavaScript(script);
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'progress':
          setVideoProgress(data.progress);
          if (onProgress) {
            onProgress(data.progress);
          }
          // Mark as complete when video reaches 90%
          if (data.progress >= 90 && !isPlaying) {
            setIsPlaying(true);
            if (onComplete) {
              onComplete();
            }
          }
          break;
        case 'playing':
          setIsPlaying(true);
          break;
        case 'paused':
          setIsPlaying(false);
          break;
        case 'ended':
          setVideoProgress(100);
          setIsPlaying(false);
          if (onProgress) {
            onProgress(100);
          }
          if (onComplete) {
            onComplete();
          }
          // Auto-play next video after 2 seconds
          if (hasNext) {
            setTimeout(() => {
              Alert.alert(
                'Video Complete',
                'Would you like to continue to the next lesson?',
                [
                  { text: 'Stay', style: 'cancel' },
                  { text: 'Next Lesson', onPress: onNext }
                ]
              );
            }, 2000);
          }
          break;
      }
    } catch (error) {
      console.log('Error parsing message:', error);
    }
  };

  const renderYouTubeEmbed = (youtubeId: string) => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            margin: 0;
            background: #000;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            overflow: hidden;
          }
          .video-container {
            position: relative;
            width: 100%;
            height: 0;
            padding-bottom: 56.25%; /* 16:9 Aspect Ratio */
          }
          iframe {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: none;
          }
        </style>
      </head>
      <body>
        <div class="video-container">
          <iframe
            id="player"
            src="https://www.youtube.com/embed/${youtubeId}?enablejsapi=1&playsinline=1&rel=0&modestbranding=1"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          ></iframe>
        </div>
        <script src="https://www.youtube.com/iframe_api"></script>
      </body>
      </html>
    `;
    return html;
  };

  const extractYouTubeId = (url: string): string | null => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderVideoPlayer = () => {
    if (!videoUrl) {
      return (
        <View style={styles.placeholderContainer}>
          <View style={styles.placeholderContent}>
            <View style={styles.placeholderIconContainer}>
              <Ionicons name="videocam-off-outline" size={80} color="#d1d7dc" />
            </View>
            <Text style={styles.placeholderTitle}>No video available</Text>
            <Text style={styles.placeholderText}>
              This lesson doesn't have a video yet
            </Text>
            {lesson.description && (
              <View style={styles.descriptionCard}>
                <Text style={styles.descriptionTitle}>Lesson Notes:</Text>
                <Text style={styles.descriptionText}>{lesson.description}</Text>
              </View>
            )}
          </View>
        </View>
      );
    }

    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      const youtubeId = extractYouTubeId(videoUrl);
      if (youtubeId) {
        return (
          <View style={styles.videoWrapper}>
            {loading && (
              <View style={styles.loadingOverlay}>
                <View style={styles.loadingContent}>
                  <ActivityIndicator size="large" color="#a435f0" />
                  <Text style={styles.loadingText}>Loading video...</Text>
                </View>
              </View>
            )}
            <WebView
              ref={webViewRef}
              source={{ html: renderYouTubeEmbed(youtubeId) }}
              style={styles.webview}
              onLoadStart={handleLoadStart}
              onLoadEnd={handleLoadEnd}
              onError={handleError}
              onMessage={handleMessage}
              allowsFullscreenVideo={true}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              mediaPlaybackRequiresUserAction={false}
              allowsInlineMediaPlayback={true}
            />
            {/* Progress Bar Overlay */}
            {videoProgress > 0 && (
              <View style={styles.progressOverlay}>
                <View style={styles.progressBarSmall}>
                  <View 
                    style={[styles.progressBarSmallFill, { width: `${videoProgress}%` }]} 
                  />
                </View>
                <Text style={styles.progressText}>{videoProgress}% watched</Text>
              </View>
            )}
          </View>
        );
      }
    }

    return (
      <View style={styles.placeholderContainer}>
        <View style={styles.placeholderContent}>
          <View style={styles.placeholderIconContainer}>
            <Ionicons name="play-circle-outline" size={80} color="#a435f0" />
          </View>
          <Text style={styles.placeholderTitle}>External Video</Text>
          <Text style={styles.placeholderText}>
            This video is hosted externally
          </Text>
          <TouchableOpacity 
            style={styles.externalLinkButton}
            onPress={() => Alert.alert('Video URL', videoUrl)}
          >
            <Ionicons name="link-outline" size={20} color="#a435f0" />
            <Text style={styles.externalLinkText}>View Video Link</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {error ? (
        <View style={styles.errorContainer}>
          <View style={styles.errorContent}>
            <View style={styles.errorIconContainer}>
              <Ionicons name="alert-circle-outline" size={64} color="#E53E3E" />
            </View>
            <Text style={styles.errorTitle}>Unable to Load Video</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => {
                setError(null);
                setLoading(true);
                webViewRef.current?.reload();
              }}
            >
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        renderVideoPlayer()
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoWrapper: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingContent: {
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  progressOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBarSmall: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarSmallFill: {
    height: '100%',
    backgroundColor: '#4299E1',
  },
  progressText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    minWidth: 80,
    textAlign: 'right',
  },
  placeholderContainer: {
    flex: 1,
    backgroundColor: '#f7f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  placeholderContent: {
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
  },
  placeholderIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  placeholderTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1c1d1f',
    marginBottom: 8,
    textAlign: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#6a6f73',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  descriptionCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    width: '100%',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#d1d7dc',
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1c1d1f',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 15,
    color: '#1c1d1f',
    lineHeight: 24,
  },
  externalLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#4299E1',
    marginTop: 8,
  },
  externalLinkText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4299E1',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#f7f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorContent: {
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
  },
  errorIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1c1d1f',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#6a6f73',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#4299E1',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});