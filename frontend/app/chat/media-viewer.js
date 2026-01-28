// app/chat/media-viewer.js
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  FlatList,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { chatAPI } from '../../utils/api';
import { API_URL, fixImageUrl } from '../../utils/api';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// 动态计算列数：根据屏幕宽度
const calculateColumns = () => {
  const itemWidth = 120; // 每个项目的最小宽度
  const spacing = 12; // 间距
  const availableWidth = screenWidth - (spacing * 2); // 可用宽度（减去左右padding）
  const columns = Math.floor(availableWidth / (itemWidth + spacing));
  return Math.max(2, Math.min(5, columns)); // 限制在2到5列之间
};

export default function MediaViewer() {
  const router = useRouter();
  const { roomId } = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState('images');
  const [media, setMedia] = useState({
    images: [],
    videos: [],
    audio: [],
    files: []
  });
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [columns, setColumns] = useState(calculateColumns());

  useEffect(() => {
    loadMedia();
    loadStats();
    
    // 监听屏幕旋转 - 使用新的 API
    const subscription = Dimensions.addEventListener('change', updateLayout);
    
    return () => {
      // 移除监听器 - 使用新的 API
      subscription.remove();
    };
  }, [roomId]);

  const loadMedia = async () => {
    try {
      setLoading(true);
      const response = await chatAPI.getChatMedia(roomId);
      if (response.data.success) {
        setMedia(response.data.media);
      }
    } catch (error) {
      console.error('載入多媒體失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await chatAPI.getChatStats(roomId);
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('載入統計失敗:', error);
    }
  };

  const updateLayout = () => {
    setColumns(calculateColumns());
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // 修改：使用模態框預覽圖片，而不是路由跳轉
  const handleImagePress = (imageUrl) => {
    if (imageUrl) {
      const fullUrl = fixImageUrl(imageUrl);
      setSelectedImage(fullUrl);
    }
  };

  // 計算每個媒體項目的寬度
  const getItemWidth = () => {
    const spacing = 8; // 項目之間的間距
    const padding = 16; // 列表的左右padding
    const availableWidth = screenWidth - (padding * 2);
    const itemWidth = (availableWidth - (spacing * (columns - 1))) / columns;
    return itemWidth;
  };

  const renderMediaItem = ({ item }) => {
    const itemWidth = getItemWidth();
    
    return (
      <TouchableOpacity
        style={[styles.mediaItem, { width: itemWidth }]}
        onPress={() => {
          if (item.type === 'image') {
            handleImagePress(item.url);
          }
        }}
      >
        {item.type === 'image' ? (
          <Image
            source={{ uri: fixImageUrl(item.url) }}
            style={[styles.mediaImage, { width: itemWidth - 16, height: itemWidth - 16 }]}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.mediaIconContainer, { width: itemWidth - 16, height: itemWidth - 16 }]}>
            {item.type === 'video' && (
              <MaterialCommunityIcons name="video" size={40} color="#f4c7ab" />
            )}
            {item.type === 'audio' && (
              <MaterialCommunityIcons name="music" size={40} color="#f4c7ab" />
            )}
            {item.type === 'file' && (
              <MaterialCommunityIcons name="file-document" size={40} color="#f4c7ab" />
            )}
            <Text style={styles.mediaTypeText}>
              {item.type === 'video' ? '影片' : item.type === 'audio' ? '音頻' : '文件'}
            </Text>
          </View>
        )}
        
        <View style={styles.mediaInfo}>
          <Text style={styles.fileName} numberOfLines={1}>
            {item.fileName || item.type}
          </Text>
          <Text style={styles.fileSize}>{formatFileSize(item.fileSize)}</Text>
          <Text style={styles.senderName} numberOfLines={1}>{item.sender?.name}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderImagePreviewModal = () => (
    <Modal
      visible={!!selectedImage}
      transparent
      animationType="fade"
      onRequestClose={() => setSelectedImage(null)}
    >
      <View style={styles.imagePreviewContainer}>
        <TouchableOpacity
          style={styles.imagePreviewBackground}
          activeOpacity={1}
          onPress={() => setSelectedImage(null)}
        />
        
        <View style={styles.imagePreviewWrapper}>
          <TouchableOpacity 
            style={styles.imagePreviewClose}
            onPress={() => setSelectedImage(null)}
          >
            <MaterialCommunityIcons name="close" size={30} color="#fff" />
          </TouchableOpacity>
          
          <ScrollView
            style={styles.imageScrollView}
            contentContainerStyle={styles.imageScrollViewContent}
            maximumZoomScale={3}
            minimumZoomScale={1}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          >
            <Image 
              source={{ uri: selectedImage }} 
              style={styles.imagePreview}
              resizeMode="contain"
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons 
        name={
          activeTab === 'images' ? 'image-off' :
          activeTab === 'videos' ? 'video-off' :
          activeTab === 'audio' ? 'music-off' : 'file-document-off'
        }
        size={80} 
        color="#f4c7ab" 
      />
      <Text style={styles.emptyText}>沒有{getTabLabel(activeTab)}</Text>
      <Text style={styles.emptySubtext}>此聊天室還沒有{getTabLabel(activeTab)}消息</Text>
    </View>
  );

  const getTabLabel = (tab) => {
    switch (tab) {
      case 'images': return '圖片';
      case 'videos': return '影片';
      case 'audio': return '音頻';
      case 'files': return '文件';
      default: return '';
    }
  };

  const getCurrentMedia = () => {
    return media[activeTab] || [];
  };

  return (
    <LinearGradient
      colors={['#fffaf5', '#fff5ed', '#ffefe2', '#ffe8d6']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* 頭部 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#5c4033" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>聊天媒體</Text>
          <View style={styles.headerRight}>
            <Text style={styles.columnInfo}>每行 {columns} 張</Text>
          </View>
        </View>

        {/* 統計信息 */}
        {stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="message-text" size={20} color="#8b5e3c" />
              <Text style={styles.statValue}>{stats.total_messages || 0}</Text>
              <Text style={styles.statLabel}>總消息</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="image" size={20} color="#8b5e3c" />
              <Text style={styles.statValue}>{stats.image_count || 0}</Text>
              <Text style={styles.statLabel}>圖片</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="video" size={20} color="#8b5e3c" />
              <Text style={styles.statValue}>{stats.video_count || 0}</Text>
              <Text style={styles.statLabel}>影片</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="file-document" size={20} color="#8b5e3c" />
              <Text style={styles.statValue}>{stats.file_count || 0}</Text>
              <Text style={styles.statLabel}>文件</Text>
            </View>
          </View>
        )}

        {/* 標籤頁 - 改為兩行兩列的網格 */}
        <View style={styles.tabsGridContainer}>
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'images' && styles.activeTab]}
              onPress={() => setActiveTab('images')}
            >
              <MaterialCommunityIcons
                name="image"
                size={28}
                color={activeTab === 'images' ? '#5c4033' : '#8b5e3c'}
              />
              <Text style={[styles.tabText, activeTab === 'images' && styles.activeTabText]}>
                圖片 ({media.images?.length || 0})
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.tab, activeTab === 'videos' && styles.activeTab]}
              onPress={() => setActiveTab('videos')}
            >
              <MaterialCommunityIcons
                name="video"
                size={28}
                color={activeTab === 'videos' ? '#5c4033' : '#8b5e3c'}
              />
              <Text style={[styles.tabText, activeTab === 'videos' && styles.activeTabText]}>
                影片 ({media.videos?.length || 0})
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'audio' && styles.activeTab]}
              onPress={() => setActiveTab('audio')}
            >
              <MaterialCommunityIcons
                name="music"
                size={28}
                color={activeTab === 'audio' ? '#5c4033' : '#8b5e3c'}
              />
              <Text style={[styles.tabText, activeTab === 'audio' && styles.activeTabText]}>
                音頻 ({media.audio?.length || 0})
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.tab, activeTab === 'files' && styles.activeTab]}
              onPress={() => setActiveTab('files')}
            >
              <MaterialCommunityIcons
                name="file-document"
                size={28}
                color={activeTab === 'files' ? '#5c4033' : '#8b5e3c'}
              />
              <Text style={[styles.tabText, activeTab === 'files' && styles.activeTabText]}>
                文件 ({media.files?.length || 0})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 媒體列表 */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#f4c7ab" />
            <Text style={styles.loadingText}>載入中...</Text>
          </View>
        ) : (
          <FlatList
            data={getCurrentMedia()}
            renderItem={renderMediaItem}
            keyExtractor={item => item.id}
            numColumns={columns}
            contentContainerStyle={styles.mediaList}
            ListEmptyComponent={renderEmptyState}
            showsVerticalScrollIndicator={false}
            key={columns} // 當列數改變時重新渲染
          />
        )}

        {/* 圖片預覽模態框 */}
        {renderImagePreviewModal()}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: 'rgba(255, 250, 245, 0.6)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(244, 199, 171, 0.3)',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(244, 199, 171, 0.25)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#5c4033',
  },
  headerRight: {
    width: 80,
    alignItems: 'flex-end',
  },
  columnInfo: {
    fontSize: 12,
    color: '#8b5e3c',
    fontStyle: 'italic',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 20,
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(244, 199, 171, 0.3)',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#5c4033',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8b5e3c',
  },
  // 新的標籤頁網格樣式
  tabsGridContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(244, 199, 171, 0.2)',
    marginHorizontal: 6,
  },
  activeTab: {
    backgroundColor: '#f4c7ab',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8b5e3c',
    marginTop: 8,
  },
  activeTabText: {
    color: '#5c4033',
  },
  mediaList: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  mediaItem: {
    margin: 8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(244, 199, 171, 0.3)',
    alignItems: 'center',
  },
  mediaImage: {
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    marginTop: 8,
  },
  mediaIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginTop: 8,
  },
  mediaTypeText: {
    fontSize: 12,
    color: '#8b5e3c',
    marginTop: 4,
  },
  mediaInfo: {
    padding: 8,
    alignItems: 'center',
    width: '100%',
  },
  fileName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5c4033',
    marginBottom: 2,
    textAlign: 'center',
  },
  fileSize: {
    fontSize: 10,
    color: '#8b5e3c',
    marginBottom: 2,
    textAlign: 'center',
  },
  senderName: {
    fontSize: 10,
    color: '#a0785e',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#5c4033',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8b5e3c',
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8b5e3c',
    marginTop: 12,
  },
  // 圖片預覽模態框樣式
  imagePreviewContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  imagePreviewBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  imagePreviewWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  imagePreviewClose: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1000,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  imageScrollView: {
    width: screenWidth,
    height: screenHeight,
  },
  imageScrollViewContent: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: screenHeight,
  },
  imagePreview: {
    width: screenWidth,
    height: screenHeight,
  },
});