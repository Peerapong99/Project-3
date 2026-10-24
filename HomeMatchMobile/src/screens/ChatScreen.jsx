
import React, {
  useCallback,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  useFocusEffect,
} from '@react-navigation/native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons/static';

import {
  getMessages,
  markConversationAsRead,
  sendMessage,
} from '../services/chatService';

import {
  getStoredUser,
} from '../services/authService';

// =========================================
// HELPERS
// =========================================

const getMessageId = message => {
  const id = message?._id || message?.id;
  return id ? String(id) : null;
};

const normalizeMessages = items => {
  if (!Array.isArray(items)) return [];

  const unique = new Map();

  items.forEach((item, index) => {
    const id = getMessageId(item);

    const key =
      id ||
      `fallback-${item?.createdAt || ''}-${index}`;

    unique.set(key, item);
  });

  return Array.from(unique.values()).sort((a, b) => {
    const timeA = new Date(a?.createdAt || 0).getTime();
    const timeB = new Date(b?.createdAt || 0).getTime();

    return (
      (Number.isFinite(timeA) ? timeA : 0) -
      (Number.isFinite(timeB) ? timeB : 0)
    );
  });
};

const mergeMessages = (previous, incoming) => {
  return normalizeMessages([
    ...previous,
    ...incoming,
  ]);
};

const formatTime = value => {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// =========================================
// CHAT SCREEN
// =========================================

const ChatScreen = ({ navigation, route }) => {
  const {
    conversationId,
    otherUserName,
    propertyTitle,
  } = route.params || {};

  const [currentUser, setCurrentUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const flatListRef = useRef(null);

  const activeRef = useRef(false);
  const requestInProgressRef = useRef(false);
  const requestVersionRef = useRef(0);
  const nearBottomRef = useRef(true);
  const initialScrollRef = useRef(true);
  const sendingRef = useRef(false);

  const messagesRef = useRef([]);

  const updateMessages = useCallback(updater => {
    setMessages(previous => {
      const next =
        typeof updater === 'function'
          ? updater(previous)
          : updater;

      messagesRef.current = next;
      return next;
    });
  }, []);

  // =========================================
  // LOAD MESSAGES
  // =========================================

  const loadMessages = useCallback(
    async (showLoading = false) => {
      if (!conversationId) {
        if (activeRef.current) {
          setErrorMessage(
            'ไม่พบข้อมูลการสนทนา กรุณากลับไปเลือกแชทอีกครั้ง',
          );
          setLoading(false);
        }
        return;
      }

      if (requestInProgressRef.current) {
        return;
      }

      requestInProgressRef.current = true;

      const requestVersion = requestVersionRef.current;

      try {
        if (showLoading && activeRef.current) {
          setLoading(true);
        }

        const user = await getStoredUser();

        if (
          !activeRef.current ||
          requestVersion !== requestVersionRef.current
        ) {
          return;
        }

        if (!user) {
          setErrorMessage(
            'กรุณาเข้าสู่ระบบเพื่อใช้งานแชท',
          );
          return;
        }

        setCurrentUser(user);

        const data = await getMessages(conversationId);

        if (
          !activeRef.current ||
          requestVersion !== requestVersionRef.current
        ) {
          return;
        }

        const incoming = Array.isArray(data?.messages)
          ? data.messages
          : Array.isArray(data?.data?.messages)
            ? data.data.messages
            : Array.isArray(data?.data)
              ? data.data
              : [];

        updateMessages(previous =>
          mergeMessages(previous, incoming),
        );

        setErrorMessage('');

        try {
          await markConversationAsRead(conversationId);
        } catch (readError) {
          console.log(
            'MARK READ ERROR:',
            readError?.response?.data ||
              readError?.message,
          );
        }
      } catch (error) {
        console.log(
          'LOAD MESSAGES ERROR:',
          error?.response?.data ||
            error?.message ||
            error,
        );

        if (
          activeRef.current &&
          requestVersion === requestVersionRef.current
        ) {
          setErrorMessage(
            error?.response?.data?.message ||
              'ไม่สามารถโหลดข้อความได้ กรุณาลองใหม่อีกครั้ง',
          );
        }
      } finally {
        if (requestVersion === requestVersionRef.current) {
          requestInProgressRef.current = false;

          if (activeRef.current) {
            setLoading(false);
          }
        }
      }
    },
    [conversationId, updateMessages],
  );

  // =========================================
  // FOCUS + POLLING
  // =========================================

  useFocusEffect(
    useCallback(() => {
      activeRef.current = true;
      requestInProgressRef.current = false;
      requestVersionRef.current += 1;

      initialScrollRef.current = true;
      nearBottomRef.current = true;

      setLoading(true);
      setErrorMessage('');
      updateMessages([]);
      setCurrentUser(null);

      loadMessages(true);

      const interval = setInterval(() => {
        if (
          activeRef.current &&
          !sendingRef.current
        ) {
          loadMessages(false);
        }
      }, 4000);

      return () => {
        activeRef.current = false;
        requestVersionRef.current += 1;
        requestInProgressRef.current = false;
        clearInterval(interval);
      };
    }, [loadMessages, updateMessages]),
  );

  // =========================================
  // SCROLL
  // =========================================

  const scrollToBottom = useCallback(
    (animated = false) => {
      flatListRef.current?.scrollToEnd({
        animated,
      });
    },
    [],
  );

  const handleScroll = event => {
    const {
      contentOffset,
      contentSize,
      layoutMeasurement,
    } = event.nativeEvent;

    const distanceFromBottom =
      contentSize.height -
      (contentOffset.y + layoutMeasurement.height);

    nearBottomRef.current =
      distanceFromBottom < 100;
  };

  const handleContentSizeChange = () => {
    if (initialScrollRef.current) {
      scrollToBottom(false);

      if (messagesRef.current.length > 0) {
        initialScrollRef.current = false;
      }

      return;
    }

    if (nearBottomRef.current) {
      scrollToBottom(false);
    }
  };

  // =========================================
  // SEND MESSAGE
  // =========================================

  const handleSend = async () => {
    const cleanMessage = messageText.trim();

    if (
      !cleanMessage ||
      sendingRef.current ||
      !conversationId
    ) {
      return;
    }

    sendingRef.current = true;
    setSending(true);
    setErrorMessage('');

    try {
      const data = await sendMessage(
        conversationId,
        cleanMessage,
      );

      setMessageText('');

      const newMessage =
        data?.data?._id
          ? data.data
          : data?.message?._id
            ? data.message
            : null;

      nearBottomRef.current = true;

      if (newMessage) {
        updateMessages(previous =>
          mergeMessages(previous, [newMessage]),
        );
      } else {
        await loadMessages(false);
      }

      setTimeout(() => {
        if (activeRef.current) {
          scrollToBottom(true);
        }
      }, 100);
    } catch (error) {
      console.log(
        'SEND MESSAGE ERROR:',
        error?.response?.data ||
          error?.message ||
          error,
      );

      if (activeRef.current) {
        setErrorMessage(
          error?.response?.data?.message ||
            'ส่งข้อความไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
        );
      }
    } finally {
      sendingRef.current = false;

      if (activeRef.current) {
        setSending(false);
      }
    }
  };

  // =========================================
  // CHECK OWN MESSAGE
  // =========================================

  const isMyMessage = message => {
    const senderId =
      message?.sender?._id ||
      message?.sender?.id ||
      message?.sender;

    const currentUserId =
      currentUser?._id ||
      currentUser?.id ||
      currentUser?.userId;

    if (!senderId || !currentUserId) {
      return false;
    }

    return (
      String(senderId) === String(currentUserId)
    );
  };

  // =========================================
  // MESSAGE ITEM
  // =========================================

  const renderMessage = ({ item }) => {
    const mine = isMyMessage(item);

    return (
      <View
        style={[
          styles.messageRow,
          mine
            ? styles.myMessageRow
            : styles.otherMessageRow,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            mine
              ? styles.myMessageBubble
              : styles.otherMessageBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              mine
                ? styles.myMessageText
                : styles.otherMessageText,
            ]}
          >
            {item.message}
          </Text>

          {!!item.sharedDesign && (
            <Pressable onPress={() => navigation.navigate('SharedDesign', {sharedConversationId:conversationId,sharedMessageId:String(item._id)})} style={styles.sharedCard}>
              <Text style={styles.sharedTitle}>แบบห้องที่แชร์</Text>
              <Text style={styles.sharedDetail}>{item.sharedDesign.design?.designName || 'แบบห้อง'} · ดูแบบและสรุปราคา →</Text>
            </Pressable>
          )}
          <View style={styles.messageFooter}>
            <Text
              style={[
                styles.messageTime,
                mine
                  ? styles.myTime
                  : styles.otherTime,
              ]}
            >
              {formatTime(item.createdAt)}
            </Text>

            {mine && (
              <MaterialDesignIcons
                name={
                  item.isRead
                    ? 'check-all'
                    : 'check'
                }
                size={14}
                color="rgba(255,255,255,0.75)"
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  // =========================================
  // BACK
  // =========================================

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('MainTabs', {
        screen: 'Home',
      });
    }
  };

  // =========================================
  // UI
  // =========================================

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={handleBack}
            hitSlop={10}
          >
            <MaterialDesignIcons
              name="arrow-left"
              size={25}
              color="#0F172A"
            />
          </Pressable>

          <View style={styles.avatar}>
            <MaterialDesignIcons
              name="account"
              size={23}
              color="#0F9D8A"
            />
          </View>

          <View style={styles.headerContent}>
            <Text
              numberOfLines={1}
              style={styles.headerName}
            >
              {otherUserName || 'ข้อความ'}
            </Text>

            <Text
              numberOfLines={1}
              style={styles.headerProperty}
            >
              {propertyTitle || 'ประกาศบ้าน'}
            </Text>
          </View>
        </View>

        {/* PROPERTY INFO */}
        <View style={styles.propertyBar}>
          <MaterialDesignIcons
            name="home-outline"
            size={18}
            color="#0F9D8A"
          />

          <Text
            numberOfLines={1}
            style={styles.propertyBarText}
          >
            กำลังสนทนาเกี่ยวกับ{' '}
            {propertyTitle || 'ประกาศบ้าน'}
          </Text>
        </View>

        {/* ERROR */}
        {!!errorMessage && (
          <View style={styles.errorBox}>
            <MaterialDesignIcons
              name="alert-circle-outline"
              size={17}
              color="#DC2626"
            />

            <Text style={styles.errorText}>
              {errorMessage}
            </Text>

            <Pressable
              onPress={() => loadMessages(true)}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>
                ลองใหม่
              </Text>
            </Pressable>
          </View>
        )}

        {/* MESSAGES */}
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
            ref={flatListRef}
            data={messages}
            keyExtractor={(item, index) =>
              getMessageId(item) ||
              `message-${index}`
            }
            renderItem={renderMessage}
            contentContainerStyle={
              styles.messagesContent
            }
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={100}
            onContentSizeChange={
              handleContentSizeChange
            }
            ListEmptyComponent={
              !errorMessage ? (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIcon}>
                    <MaterialDesignIcons
                      name="message-text-outline"
                      size={40}
                      color="#94A3B8"
                    />
                  </View>

                  <Text style={styles.emptyTitle}>
                    เริ่มการสนทนา
                  </Text>

                  <Text
                    style={styles.emptyDescription}
                  >
                    ส่งข้อความแรกเพื่อสอบถามเกี่ยวกับบ้านหลังนี้
                  </Text>
                </View>
              ) : null
            }
          />
        )}

        {/* INPUT */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={messageText}
            onChangeText={setMessageText}
            placeholder="พิมพ์ข้อความ..."
            placeholderTextColor="#94A3B8"
            multiline
            maxLength={2000}
            editable={
              !!conversationId &&
              !sending
            }
          />

          <Pressable
            disabled={
              !messageText.trim() ||
              sending ||
              !conversationId
            }
            style={[
              styles.sendButton,
              (!messageText.trim() ||
                sending ||
                !conversationId) &&
                styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
          >
            {sending ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            ) : (
              <MaterialDesignIcons
                name="send"
                size={21}
                color="#FFFFFF"
              />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatScreen;

// =========================================
// STYLES
// =========================================

const styles = StyleSheet.create({
  sharedCard:{backgroundColor:'#ECFDF5',padding:12,borderRadius:10,marginTop:8},
  sharedTitle:{color:'#0F9D8A',fontWeight:'700'},
  sharedDetail:{color:'#334155',fontSize:12,marginTop:4},
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  keyboardContainer: {
    flex: 1,
  },

  header: {
    minHeight: 70,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },

  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatar: {
    width: 42,
    height: 42,
    marginLeft: 4,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDFA',
  },

  headerContent: {
    flex: 1,
    marginLeft: 11,
  },

  headerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },

  headerProperty: {
    marginTop: 2,
    fontSize: 10,
    color: '#64748B',
  },

  propertyBar: {
    minHeight: 42,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#F0FDFA',
    borderBottomWidth: 1,
    borderBottomColor: '#CCFBF1',
  },

  propertyBarText: {
    flex: 1,
    fontSize: 10,
    fontWeight: '600',
    color: '#0F766E',
  },

  messagesContent: {
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingVertical: 18,
  },

  messageRow: {
    width: '100%',
    marginBottom: 9,
    flexDirection: 'row',
  },

  myMessageRow: {
    justifyContent: 'flex-end',
  },

  otherMessageRow: {
    justifyContent: 'flex-start',
  },

  messageBubble: {
    maxWidth: '78%',
    paddingHorizontal: 13,
    paddingTop: 9,
    paddingBottom: 6,
    borderRadius: 16,
  },

  myMessageBubble: {
    backgroundColor: '#0F9D8A',
    borderBottomRightRadius: 4,
  },

  otherMessageBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomLeftRadius: 4,
  },

  messageText: {
    fontSize: 13,
    lineHeight: 19,
  },

  myMessageText: {
    color: '#FFFFFF',
  },

  otherMessageText: {
    color: '#334155',
  },

  messageFooter: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
  },

  messageTime: {
    fontSize: 8,
  },

  myTime: {
    color: 'rgba(255,255,255,0.7)',
  },

  otherTime: {
    color: '#94A3B8',
  },

  inputContainer: {
    minHeight: 68,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },

  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    fontSize: 12,
    color: '#0F172A',
    backgroundColor: '#F1F5F9',
  },

  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F9D8A',
  },

  sendButtonDisabled: {
    opacity: 0.4,
  },

  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 10,
    fontSize: 11,
    color: '#64748B',
  },

  emptyContainer: {
    flex: 1,
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },

  emptyTitle: {
    marginTop: 15,
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },

  emptyDescription: {
    marginTop: 6,
    maxWidth: 260,
    fontSize: 10,
    lineHeight: 16,
    textAlign: 'center',
    color: '#94A3B8',
  },

  errorBox: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
  },

  errorText: {
    flex: 1,
    fontSize: 10,
    color: '#B91C1C',
  },

  retryButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },

  retryText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B91C1C',
  },
});
