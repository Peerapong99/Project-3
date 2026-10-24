
import React, {
  useCallback,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  useFocusEffect,
} from '@react-navigation/native';

import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons/static';

import {
  API_ORIGIN,
} from '../services/api';

import {
  getMyConversations,
} from '../services/chatService';

import {
  getStoredUser,
} from '../services/authService';

// =========================================
// IMAGE URL
// =========================================

const getImageUrl = image => {
  const path =
    typeof image === 'string'
      ? image
      : image?.url ||
        image?.path ||
        image?.filename;

  if (!path || typeof path !== 'string') {
    return null;
  }

  if (
    path.startsWith('http://') ||
    path.startsWith('https://')
  ) {
    return path;
  }

  if (!API_ORIGIN) {
    return null;
  }

  const cleanPath = path.startsWith('/')
    ? path
    : `/${path}`;

  return `${API_ORIGIN.replace(/\/$/, '')}${cleanPath}`;
};

// =========================================
// FORMAT TIME
// =========================================

const formatTime = value => {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const now = new Date();

  const sameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (sameDay) {
    return date.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return date.toLocaleDateString('th-TH', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
};

// =========================================
// MESSAGES SCREEN
// =========================================

const MessagesScreen = ({navigation}) => {
  const [conversations, setConversations] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const activeRef = useRef(false);
  const requestIdRef = useRef(0);
  const inFlightRef = useRef(false);
  const pendingRefreshRef = useRef(false);

  // =========================================
  // LOAD CONVERSATIONS
  // =========================================

  const loadConversations = useCallback(
    async (showLoading = false) => {
      if (!activeRef.current) {
        return;
      }

      // ไม่ยิง API ซ้อนกัน
      if (inFlightRef.current) {
        if (showLoading) {
          pendingRefreshRef.current = true;
        }
        return;
      }

      inFlightRef.current = true;

      const requestId = requestIdRef.current;

      try {
        if (showLoading) {
          setLoading(true);
        }

        const user = await getStoredUser();

        if (
          !activeRef.current ||
          requestId !== requestIdRef.current
        ) {
          return;
        }

        setCurrentUser(user);

        if (!user) {
          setConversations([]);
          setErrorMessage('');
          return;
        }

        const data = await getMyConversations();

        if (
          !activeRef.current ||
          requestId !== requestIdRef.current
        ) {
          return;
        }

        const list = Array.isArray(data?.conversations)
          ? data.conversations
          : Array.isArray(data?.data?.conversations)
            ? data.data.conversations
            : [];

        setConversations(list);
        setErrorMessage('');
      } catch (error) {
        console.log(
          'LOAD CONVERSATIONS ERROR:',
          error?.response?.data ||
            error?.message ||
            error,
        );

        if (
          activeRef.current &&
          requestId === requestIdRef.current
        ) {
          const message =
            error?.message === 'NOT_LOGGED_IN' ||
            error?.response?.status === 401
              ? 'กรุณาเข้าสู่ระบบเพื่อดูข้อความ'
              : error?.response?.data?.message ||
                'ไม่สามารถโหลดรายการสนทนาได้';

          setErrorMessage(message);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          inFlightRef.current = false;

          if (activeRef.current) {
            setLoading(false);
            setRefreshing(false);

            if (pendingRefreshRef.current) {
              pendingRefreshRef.current = false;

              // รอให้คำขอเดิมจบก่อนแล้วจึงโหลดใหม่
              Promise.resolve().then(() => {
                if (activeRef.current) {
                  loadConversations(false);
                }
              });
            }
          }
        }
      }
    },
    [],
  );

  // =========================================
  // FOCUS + AUTO REFRESH
  // =========================================

  useFocusEffect(
    useCallback(() => {
      activeRef.current = true;
      requestIdRef.current += 1;

      inFlightRef.current = false;
      pendingRefreshRef.current = false;

      setLoading(true);
      setRefreshing(false);
      setErrorMessage('');
      setCurrentUser(null);
      setConversations([]);

      loadConversations(true);

      const interval = setInterval(() => {
        if (activeRef.current) {
          loadConversations(false);
        }
      }, 5000);

      return () => {
        activeRef.current = false;
        requestIdRef.current += 1;

        inFlightRef.current = false;
        pendingRefreshRef.current = false;

        clearInterval(interval);
      };
    }, [loadConversations]),
  );

  // =========================================
  // MANUAL REFRESH
  // =========================================

  const handleRefresh = () => {
    setRefreshing(true);
    loadConversations(false);
  };

  // =========================================
  // OPEN CHAT
  // =========================================

  const handleOpenChat = conversation => {
    const conversationId =
      conversation?._id || conversation?.id;

    if (!conversationId) {
      setErrorMessage(
        'ไม่พบข้อมูลการสนทนา กรุณาลองใหม่',
      );
      return;
    }

    const isBuyer = currentUser?.role === 'buyer';

    const otherUser = isBuyer
      ? conversation.seller
      : conversation.buyer;

    const property = conversation.property;

    navigation.navigate('Chat', {
      conversationId: String(conversationId),
      otherUserName:
        otherUser?.name ||
        (isBuyer ? 'ผู้ขาย' : 'ผู้ซื้อ'),
      propertyTitle:
        property?.title || 'ประกาศบ้าน',
      propertyId: property?._id,
    });
  };

  // =========================================
  // RENDER CONVERSATION
  // =========================================

  const renderConversation = ({item}) => {
    const isBuyer = currentUser?.role === 'buyer';

    const otherUser = isBuyer
      ? item.seller
      : item.buyer;

    const property = item.property;
    const propertyImage = property?.images?.[0];
    const imageUrl = getImageUrl(propertyImage);

    return (
      <Pressable
        style={({pressed}) => [
          styles.conversationCard,
          pressed && styles.pressedCard,
        ]}
        onPress={() => handleOpenChat(item)}
      >
        {/* PROPERTY IMAGE */}
        <View style={styles.imageContainer}>
          {imageUrl ? (
            <Image
              source={{uri: imageUrl}}
              style={styles.propertyImage}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <MaterialDesignIcons
                name="home-outline"
                size={30}
                color="#94A3B8"
              />
            </View>
          )}
        </View>

        {/* CONTENT */}
        <View style={styles.content}>
          <View style={styles.nameRow}>
            <Text
              numberOfLines={1}
              style={styles.userName}
            >
              {otherUser?.name ||
                (isBuyer ? 'ผู้ขาย' : 'ผู้ซื้อ')}
            </Text>

            <Text style={styles.timeText}>
              {formatTime(
                item.lastMessageAt || item.updatedAt,
              )}
            </Text>
          </View>

          <View style={styles.propertyRow}>
            <MaterialDesignIcons
              name="home-outline"
              size={13}
              color="#0F9D8A"
            />

            <Text
              numberOfLines={1}
              style={styles.propertyText}
            >
              {property?.title || 'ประกาศบ้าน'}
            </Text>
          </View>

          <Text
            numberOfLines={1}
            style={styles.lastMessage}
          >
            {item.lastMessage || 'เริ่มการสนทนา'}
          </Text>
        </View>

        <MaterialDesignIcons
          name="chevron-right"
          size={24}
          color="#CBD5E1"
        />
      </Pressable>
    );
  };

  // =========================================
  // HEADER
  // =========================================

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>
          ข้อความ
        </Text>

        <Text style={styles.headerSubtitle}>
          {currentUser?.role === 'seller'
            ? 'ข้อความจากผู้ที่สนใจประกาศของคุณ'
            : 'สนทนากับผู้ขายเกี่ยวกับบ้านที่สนใจ'}
        </Text>
      </View>

      <View style={styles.headerIcon}>
        <MaterialDesignIcons
          name="message-text-outline"
          size={25}
          color="#0F9D8A"
        />
      </View>
    </View>
  );

  // =========================================
  // ERROR
  // =========================================

  const renderError = () => {
    if (!errorMessage) return null;

    return (
      <View style={styles.errorBox}>
        <MaterialDesignIcons
          name="alert-circle-outline"
          size={18}
          color="#DC2626"
        />

        <Text style={styles.errorText}>
          {errorMessage}
        </Text>

        <Pressable
          style={styles.retryButton}
          onPress={() => loadConversations(true)}
        >
          <Text style={styles.retryText}>
            ลองใหม่
          </Text>
        </Pressable>
      </View>
    );
  };

  // =========================================
  // NOT LOGGED IN
  // =========================================

  if (!loading && !currentUser) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}

        <View style={styles.centerContainer}>
          <View style={styles.emptyIcon}>
            <MaterialDesignIcons
              name="message-text-outline"
              size={46}
              color="#94A3B8"
            />
          </View>

          <Text style={styles.emptyTitle}>
            กรุณาเข้าสู่ระบบ
          </Text>

          <Text style={styles.emptyDescription}>
            เข้าสู่ระบบเพื่อดูและส่งข้อความ
          </Text>

          <Pressable
            style={styles.loginButton}
            onPress={() =>
              navigation.getParent()?.navigate('Login')
            }
          >
            <Text style={styles.loginButtonText}>
              เข้าสู่ระบบ
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // =========================================
  // UI
  // =========================================

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}

      {renderError()}

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator
            size="large"
            color="#0F9D8A"
          />

          <Text style={styles.loadingText}>
            กำลังโหลดข้อความ...
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item, index) =>
            String(item._id || item.id || index)
          }
          renderItem={renderConversation}
          contentContainerStyle={[
            styles.listContent,
            conversations.length === 0 &&
              styles.emptyList,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#0F9D8A"
              colors={['#0F9D8A']}
            />
          }
          ListEmptyComponent={
            !errorMessage ? (
              <View style={styles.centerContainer}>
                <View style={styles.emptyIcon}>
                  <MaterialDesignIcons
                    name="message-text-outline"
                    size={46}
                    color="#94A3B8"
                  />
                </View>

                <Text style={styles.emptyTitle}>
                  ยังไม่มีข้อความ
                </Text>

                <Text
                  style={styles.emptyDescription}
                >
                  {currentUser?.role === 'seller'
                    ? 'เมื่อผู้ซื้อทักเกี่ยวกับประกาศของคุณ ข้อความจะแสดงที่นี่'
                    : 'เมื่อคุณติดต่อผู้ขาย การสนทนาจะแสดงที่นี่'}
                </Text>
              </View>
            ) : (
              <View style={styles.centerContainer}>
                <Text style={styles.emptyDescription}>
                  กรุณากดปุ่มลองใหม่เพื่อโหลดรายการสนทนา
                </Text>
              </View>
            )
          }
        />
      )}
    </SafeAreaView>
  );
};

export default MessagesScreen;

// =========================================
// STYLES
// =========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },

  headerContent: {
    flex: 1,
    paddingRight: 10,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },

  headerSubtitle: {
    marginTop: 4,
    maxWidth: 280,
    fontSize: 11,
    lineHeight: 16,
    color: '#64748B',
  },

  headerIcon: {
    width: 45,
    height: 45,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDFA',
  },

  listContent: {
    padding: 16,
    paddingBottom: 30,
  },

  emptyList: {
    flexGrow: 1,
  },

  conversationCard: {
    minHeight: 92,
    marginBottom: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },

  pressedCard: {
    opacity: 0.7,
  },

  imageContainer: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },

  propertyImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: {
    flex: 1,
    marginLeft: 12,
    marginRight: 5,
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  userName: {
    flex: 1,
    marginRight: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },

  timeText: {
    fontSize: 9,
    color: '#94A3B8',
  },

  propertyRow: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  propertyText: {
    flex: 1,
    fontSize: 10,
    fontWeight: '600',
    color: '#0F9D8A',
  },

  lastMessage: {
    marginTop: 5,
    fontSize: 11,
    color: '#64748B',
  },

  centerContainer: {
    flex: 1,
    paddingHorizontal: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 12,
    color: '#64748B',
  },

  emptyIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },

  emptyTitle: {
    marginTop: 17,
    fontSize: 17,
    fontWeight: '700',
    color: '#334155',
  },

  emptyDescription: {
    marginTop: 7,
    maxWidth: 280,
    fontSize: 11,
    lineHeight: 18,
    textAlign: 'center',
    color: '#94A3B8',
  },

  loginButton: {
    minWidth: 150,
    height: 44,
    marginTop: 20,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F9D8A',
  },

  loginButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  errorBox: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 11,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },

  errorText: {
    flex: 1,
    fontSize: 10,
    color: '#B91C1C',
  },

  retryButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },

  retryText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B91C1C',
  },
});
