import React from 'react';

import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {SafeAreaView} from 'react-native-safe-area-context';

import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons/static';

const PrivacyPolicyScreen = ({navigation}) => {
  return (
    <SafeAreaView style={styles.container}>

      {/* =========================
          HEADER
      ========================= */}

      <View style={styles.header}>

        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}>

          <MaterialDesignIcons
            name="chevron-left"
            size={28}
            color="#0F172A"
          />

        </Pressable>

        <Text style={styles.headerTitle}>
          การใช้ข้อมูลส่วนบุคคล
        </Text>

        <View style={styles.headerRight} />

      </View>

      {/* =========================
          CONTENT
      ========================= */}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}>

        {/* =========================
            HERO
        ========================= */}

        <View style={styles.hero}>

          <View style={styles.heroIcon}>

            <MaterialDesignIcons
              name="shield-account-outline"
              size={38}
              color="#0F9D8A"
            />

          </View>

          <Text style={styles.heroTitle}>
            ความเป็นส่วนตัวของคุณสำคัญกับเรา
          </Text>

          <Text style={styles.heroDescription}>
            HomeMatch จัดเก็บและใช้ข้อมูลบางส่วน
            เพื่อให้ระบบสามารถให้บริการคุณได้อย่างถูกต้อง
            ปลอดภัย และสะดวกมากขึ้น
          </Text>

        </View>

        {/* =========================
            IMPORTANT
        ========================= */}

        <View style={styles.noticeBox}>

          <MaterialDesignIcons
            name="information-outline"
            size={21}
            color="#0F766E"
          />

          <Text style={styles.noticeText}>
            เราใช้ข้อมูลตามวัตถุประสงค์ที่เกี่ยวข้องกับการให้บริการ
            HomeMatch เช่น การสร้างบัญชี การค้นหาบ้าน
            รายการโปรด การนัดหมาย การติดต่อผู้ขาย
            และการใช้งานฟังก์ชันต่าง ๆ ภายในระบบ
          </Text>

        </View>

        {/* =========================
            1. ACCOUNT DATA
        ========================= */}

        <PrivacySection
          icon="account-outline"
          number="1"
          title="ข้อมูลบัญชีผู้ใช้"
          description="ข้อมูลที่คุณให้กับ HomeMatch ตอนสมัครสมาชิกหรือจัดการบัญชี"
          items={[
            'ชื่อและนามสกุล',
            'อีเมล',
            'เบอร์โทรศัพท์',
            'รหัสผ่านของบัญชี',
            'ประเภทบัญชีผู้ใช้งาน',
          ]}
          reason="ใช้สำหรับสร้างบัญชี ระบุตัวผู้ใช้งาน เข้าสู่ระบบ ติดต่อเกี่ยวกับบัญชี และรักษาความปลอดภัยของระบบ"
        />

        {/* =========================
            2. PROPERTY ACTIVITY
        ========================= */}

        <PrivacySection
          icon="home-search-outline"
          number="2"
          title="ข้อมูลเกี่ยวกับการค้นหาและดูบ้าน"
          description="ข้อมูลที่เกิดขึ้นเมื่อคุณใช้งานฟังก์ชันค้นหาและดูประกาศบ้าน"
          items={[
            'บ้านหรือประกาศที่ผู้ใช้เปิดดู',
            'เงื่อนไขที่ใช้ในการค้นหา',
            'ประเภทอสังหาริมทรัพย์ที่สนใจ',
            'รายการบ้านที่บันทึกเป็นรายการโปรด',
          ]}
          reason="ใช้เพื่อให้ระบบแสดงข้อมูลที่เกี่ยวข้องกับการใช้งาน และช่วยให้คุณกลับมาดูบ้านที่สนใจได้สะดวกขึ้น"
        />

        {/* =========================
            3. FAVORITE
        ========================= */}

        <PrivacySection
          icon="heart-outline"
          number="3"
          title="ข้อมูลรายการโปรด"
          description="HomeMatch สามารถจัดเก็บรายการอสังหาริมทรัพย์ที่คุณเลือกบันทึกไว้"
          items={[
            'รหัสประกาศอสังหาริมทรัพย์',
            'รายการบ้านที่คุณกดถูกใจ',
            'ข้อมูลที่จำเป็นสำหรับแสดงรายการโปรด',
          ]}
          reason="เพื่อให้คุณสามารถบันทึกบ้านที่สนใจ และกลับมาดูรายการเหล่านั้นได้ภายหลัง"
        />

        {/* =========================
            4. APPOINTMENT
        ========================= */}

        <PrivacySection
          icon="calendar-check-outline"
          number="4"
          title="ข้อมูลการนัดหมาย"
          description="เมื่อคุณใช้ฟังก์ชันนัดหมายเข้าชมอสังหาริมทรัพย์ ระบบจำเป็นต้องจัดเก็บข้อมูลที่เกี่ยวข้องกับการนัดหมาย"
          items={[
            'อสังหาริมทรัพย์ที่ต้องการเข้าชม',
            'วันที่นัดหมาย',
            'เวลานัดหมาย',
            'ข้อความที่ส่งถึงผู้ขาย',
            'สถานะของการนัดหมาย',
          ]}
          reason="ใช้สำหรับสร้างและจัดการการนัดหมายระหว่างผู้ซื้อกับผู้ขาย รวมถึงแสดงสถานะของการนัดหมาย"
        />

        {/* =========================
            5. CHAT
        ========================= */}

        <PrivacySection
          icon="message-text-outline"
          number="5"
          title="ข้อมูลการสนทนา"
          description="เมื่อมีการใช้ระบบแชตระหว่างผู้ซื้อและผู้ขาย HomeMatch จำเป็นต้องจัดเก็บข้อมูลการสนทนาบางส่วน"
          items={[
            'ผู้ส่งและผู้รับข้อความ',
            'ข้อความในการสนทนา',
            'ประกาศบ้านที่เกี่ยวข้องกับการสนทนา',
            'วันและเวลาที่ส่งข้อความ',
            'สถานะการอ่านข้อความ',
          ]}
          reason="เพื่อให้ผู้ซื้อและผู้ขายสามารถติดต่อสอบถามรายละเอียดเกี่ยวกับอสังหาริมทรัพย์ผ่านระบบ HomeMatch ได้"
        />

        {/* =========================
            6. ROOM CUSTOMIZATION
        ========================= */}

        <PrivacySection
          icon="floor-plan"
          number="6"
          title="ข้อมูลการปรับแต่งห้องและแปลน 2D"
          description="หากคุณใช้งานระบบปรับแต่งห้อง HomeMatch อาจจัดเก็บข้อมูลการออกแบบที่คุณสร้างขึ้น"
          items={[
            'ห้องที่เลือกปรับแต่ง',
            'ตำแหน่งเฟอร์นิเจอร์',
            'ประเภทเฟอร์นิเจอร์',
            'การหมุนและจัดวางเฟอร์นิเจอร์',
            'รูปแบบพื้น',
            'สีหรือรูปแบบผนัง',
            'การตกแต่งที่ผู้ใช้เลือก',
          ]}
          reason="เพื่อให้ระบบสามารถแสดงการออกแบบห้องของคุณ และรองรับการบันทึกแบบร่างเพื่อนำกลับมาแก้ไขภายหลัง"
        />

        {/* =========================
            7. TECHNICAL DATA
        ========================= */}

        <PrivacySection
          icon="cellphone"
          number="7"
          title="ข้อมูลการใช้งานระบบ"
          description="ระบบอาจมีข้อมูลทางเทคนิคที่จำเป็นสำหรับการทำงานและตรวจสอบปัญหาของแอป"
          items={[
            'สถานะการเข้าสู่ระบบ',
            'ข้อมูลที่จำเป็นสำหรับการยืนยันตัวตน',
            'การตั้งค่าที่ผู้ใช้เลือกไว้ในแอป',
            'ข้อมูลเกี่ยวกับข้อผิดพลาดของระบบเมื่อมีการใช้งาน',
          ]}
          reason="ใช้เพื่อให้ระบบทำงานได้อย่างถูกต้อง รักษาความปลอดภัย และช่วยตรวจสอบปัญหาที่เกิดขึ้นระหว่างการใช้งาน"
        />

        {/* =========================
            PASSWORD SECURITY
        ========================= */}

        <View style={styles.securityBox}>

          <View style={styles.securityHeader}>

            <View style={styles.securityIcon}>

              <MaterialDesignIcons
                name="lock-outline"
                size={22}
                color="#0F9D8A"
              />

            </View>

            <Text style={styles.securityTitle}>
              การรักษาความปลอดภัยของรหัสผ่าน
            </Text>

          </View>

          <Text style={styles.securityDescription}>
            รหัสผ่านของผู้ใช้ไม่ควรถูกจัดเก็บในรูปแบบข้อความธรรมดา
            ระบบ HomeMatch ฝั่งเซิร์ฟเวอร์ใช้กระบวนการเข้ารหัสแบบแฮช
            ก่อนจัดเก็บรหัสผ่าน เพื่อช่วยลดความเสี่ยงจากการเปิดเผยรหัสผ่าน
          </Text>

        </View>

        {/* =========================
            WHY
        ========================= */}

        <View style={styles.section}>

          <SectionTitle
            icon="help-circle-outline"
            title="ทำไม HomeMatch ต้องใช้ข้อมูลเหล่านี้?"
          />

          <ReasonItem
            icon="account-check-outline"
            title="เพื่อสร้างและจัดการบัญชี"
            description="ทำให้ระบบทราบว่าบัญชีใดเป็นของคุณ และสามารถให้บริการที่เชื่อมโยงกับบัญชีได้"
          />

          <ReasonItem
            icon="home-search-outline"
            title="เพื่อช่วยค้นหาบ้าน"
            description="ทำให้คุณสามารถค้นหา ดูรายละเอียด และบันทึกอสังหาริมทรัพย์ที่สนใจได้"
          />

          <ReasonItem
            icon="calendar-check-outline"
            title="เพื่อจัดการการนัดหมาย"
            description="ทำให้ผู้ซื้อสามารถส่งคำขอนัดหมาย และติดตามสถานะจากผู้ขายได้"
          />

          <ReasonItem
            icon="message-processing-outline"
            title="เพื่อการติดต่อสื่อสาร"
            description="รองรับการสนทนาระหว่างผู้ซื้อและผู้ขายเกี่ยวกับอสังหาริมทรัพย์ที่สนใจ"
          />

          <ReasonItem
            icon="floor-plan"
            title="เพื่อบันทึกการออกแบบห้อง"
            description="รองรับการปรับแต่งแปลน 2D และการบันทึกแบบร่างของห้องที่ผู้ใช้สร้างขึ้น"
          />

          <ReasonItem
            icon="shield-check-outline"
            title="เพื่อความปลอดภัย"
            description="ใช้ข้อมูลที่จำเป็นสำหรับการยืนยันตัวตนและป้องกันการเข้าถึงบัญชีโดยไม่ได้รับอนุญาต"
          />

        </View>

        {/* =========================
            DATA SHARING
        ========================= */}

        <View style={styles.section}>

          <SectionTitle
            icon="share-variant-outline"
            title="ข้อมูลใดอาจถูกแสดงแก่ผู้ใช้อื่น?"
          />

          <Text style={styles.paragraph}>
            ฟังก์ชันบางส่วนของ HomeMatch จำเป็นต้องส่งข้อมูลระหว่าง
            ผู้ซื้อและผู้ขาย เช่น การนัดหมายหรือการสนทนา
            โดยจะแสดงเฉพาะข้อมูลที่จำเป็นต่อการทำงานของฟังก์ชันนั้น
          </Text>

          <View style={styles.smallInfoBox}>

            <MaterialDesignIcons
              name="account-group-outline"
              size={20}
              color="#0F9D8A"
            />

            <Text style={styles.smallInfoText}>
              ตัวอย่างเช่น ผู้ขายอาจจำเป็นต้องทราบข้อมูลของผู้ซื้อ
              ที่เกี่ยวข้องกับคำขอนัดหมาย เพื่อให้สามารถตอบรับ
              หรือจัดการการนัดหมายได้
            </Text>

          </View>

        </View>

        {/* =========================
            USER CONTROL
        ========================= */}

        <View style={styles.section}>

          <SectionTitle
            icon="account-cog-outline"
            title="สิทธิ์และการควบคุมข้อมูลของคุณ"
          />

          <Text style={styles.paragraph}>
            ผู้ใช้ควรสามารถตรวจสอบและจัดการข้อมูลของตนเอง
            ผ่านฟังก์ชันที่ HomeMatch จัดเตรียมไว้
          </Text>

          <ControlItem text="ตรวจสอบข้อมูลโปรไฟล์ของตนเอง" />

          <ControlItem text="แก้ไขข้อมูลส่วนตัวที่ระบบอนุญาตให้แก้ไข" />

          <ControlItem text="จัดการรายการโปรดของตนเอง" />

          <ControlItem text="ตรวจสอบรายการนัดหมายของตนเอง" />

          <ControlItem text="จัดการข้อมูลการออกแบบห้องที่บันทึกไว้" />

          <ControlItem text="ออกจากระบบเมื่อไม่ต้องการใช้งานบัญชี" />

        </View>

        {/* =========================
            CONSENT
        ========================= */}

        <View style={styles.consentSection}>

          <MaterialDesignIcons
            name="check-decagram-outline"
            size={31}
            color="#0F9D8A"
          />

          <Text style={styles.consentTitle}>
            การให้ความยินยอม
          </Text>

          <Text style={styles.consentDescription}>
            ก่อนสร้างบัญชี HomeMatch จะแสดงข้อความเกี่ยวกับ
            การจัดเก็บและใช้ข้อมูลให้คุณทราบ
            คุณควรอ่านรายละเอียดและให้ความยินยอม
            ก่อนดำเนินการสมัครสมาชิก
          </Text>

          <Pressable
            style={styles.backToRegisterButton}
            onPress={() => navigation.goBack()}>

            <MaterialDesignIcons
              name="arrow-left"
              size={18}
              color="#FFFFFF"
            />

            <Text style={styles.backToRegisterText}>
              กลับไปหน้าสมัครสมาชิก
            </Text>

          </Pressable>

        </View>

        <Text style={styles.footerText}>
          HomeMatch • Privacy & Data Usage
        </Text>

      </ScrollView>

    </SafeAreaView>
  );
};

// =====================================================
// PRIVACY SECTION
// =====================================================

const PrivacySection = ({
  icon,
  number,
  title,
  description,
  items,
  reason,
}) => {
  return (
    <View style={styles.section}>

      <View style={styles.sectionHeader}>

        <View style={styles.sectionIcon}>

          <MaterialDesignIcons
            name={icon}
            size={22}
            color="#0F9D8A"
          />

        </View>

        <View style={styles.sectionTitleContainer}>

          <Text style={styles.sectionNumber}>
            {number}
          </Text>

          <Text style={styles.sectionTitle}>
            {title}
          </Text>

        </View>

      </View>

      <Text style={styles.paragraph}>
        {description}
      </Text>

      <View style={styles.dataList}>

        {items.map((item, index) => (
          <View
            key={`${item}-${index}`}
            style={styles.dataItem}>

            <View style={styles.bullet} />

            <Text style={styles.dataItemText}>
              {item}
            </Text>

          </View>
        ))}

      </View>

      <View style={styles.reasonBox}>

        <Text style={styles.reasonLabel}>
          นำข้อมูลไปใช้ทำอะไร?
        </Text>

        <Text style={styles.reasonText}>
          {reason}
        </Text>

      </View>

    </View>
  );
};

// =====================================================
// SECTION TITLE
// =====================================================

const SectionTitle = ({
  icon,
  title,
}) => {
  return (
    <View style={styles.simpleSectionTitle}>

      <View style={styles.sectionIcon}>

        <MaterialDesignIcons
          name={icon}
          size={22}
          color="#0F9D8A"
        />

      </View>

      <Text style={styles.simpleSectionTitleText}>
        {title}
      </Text>

    </View>
  );
};

// =====================================================
// REASON ITEM
// =====================================================

const ReasonItem = ({
  icon,
  title,
  description,
}) => {
  return (
    <View style={styles.reasonItem}>

      <View style={styles.reasonItemIcon}>

        <MaterialDesignIcons
          name={icon}
          size={20}
          color="#0F9D8A"
        />

      </View>

      <View style={styles.reasonItemContent}>

        <Text style={styles.reasonItemTitle}>
          {title}
        </Text>

        <Text style={styles.reasonItemDescription}>
          {description}
        </Text>

      </View>

    </View>
  );
};

// =====================================================
// CONTROL ITEM
// =====================================================

const ControlItem = ({text}) => {
  return (
    <View style={styles.controlItem}>

      <View style={styles.controlCheck}>

        <MaterialDesignIcons
          name="check"
          size={12}
          color="#FFFFFF"
        />

      </View>

      <Text style={styles.controlText}>
        {text}
      </Text>

    </View>
  );
};

export default PrivacyPolicyScreen;

// =====================================================
// STYLE
// =====================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,

    backgroundColor: '#F8FAFC',
  },

  // =========================
  // HEADER
  // =========================

  header: {
    height: 58,

    paddingHorizontal: 14,

    flexDirection: 'row',
    alignItems: 'center',

    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',

    backgroundColor: '#FFFFFF',
  },

  backButton: {
    width: 40,
    height: 40,

    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    flex: 1,

    fontSize: 16,
    fontWeight: '800',

    textAlign: 'center',

    color: '#0F172A',
  },

  headerRight: {
    width: 40,
  },

  // =========================
  // CONTENT
  // =========================

  content: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 45,
  },

  // =========================
  // HERO
  // =========================

  hero: {
    alignItems: 'center',

    paddingHorizontal: 20,
    paddingVertical: 25,

    borderRadius: 20,

    backgroundColor: '#ECFDF5',
  },

  heroIcon: {
    width: 66,
    height: 66,

    borderRadius: 20,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: '#FFFFFF',
  },

  heroTitle: {
    marginTop: 14,

    fontSize: 19,
    fontWeight: '900',

    textAlign: 'center',

    color: '#0F766E',
  },

  heroDescription: {
    marginTop: 8,

    fontSize: 12,
    lineHeight: 19,

    textAlign: 'center',

    color: '#64748B',
  },

  // =========================
  // NOTICE
  // =========================

  noticeBox: {
    marginTop: 16,

    padding: 14,

    flexDirection: 'row',
    alignItems: 'flex-start',

    borderRadius: 14,

    borderWidth: 1,
    borderColor: '#CCFBF1',

    backgroundColor: '#F0FDFA',
  },

  noticeText: {
    flex: 1,

    marginLeft: 9,

    fontSize: 11,
    lineHeight: 18,

    color: '#475569',
  },

  // =========================
  // SECTION
  // =========================

  section: {
    marginTop: 16,

    padding: 17,

    borderRadius: 16,

    borderWidth: 1,
    borderColor: '#E2E8F0',

    backgroundColor: '#FFFFFF',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  sectionIcon: {
    width: 42,
    height: 42,

    borderRadius: 13,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: '#ECFDF5',
  },

  sectionTitleContainer: {
    flex: 1,

    marginLeft: 11,
  },

  sectionNumber: {
    fontSize: 9,
    fontWeight: '700',

    color: '#0F9D8A',
  },

  sectionTitle: {
    marginTop: 1,

    fontSize: 14,
    fontWeight: '800',

    color: '#1E293B',
  },

  paragraph: {
    marginTop: 12,

    fontSize: 11,
    lineHeight: 18,

    color: '#64748B',
  },

  // =========================
  // DATA LIST
  // =========================

  dataList: {
    marginTop: 12,

    paddingHorizontal: 12,
    paddingVertical: 9,

    borderRadius: 12,

    backgroundColor: '#F8FAFC',
  },

  dataItem: {
    minHeight: 28,

    flexDirection: 'row',
    alignItems: 'center',
  },

  bullet: {
    width: 6,
    height: 6,

    marginRight: 9,

    borderRadius: 3,

    backgroundColor: '#0F9D8A',
  },

  dataItemText: {
    flex: 1,

    fontSize: 10,
    lineHeight: 16,

    color: '#475569',
  },

  // =========================
  // REASON
  // =========================

  reasonBox: {
    marginTop: 12,

    padding: 12,

    borderLeftWidth: 3,
    borderLeftColor: '#0F9D8A',

    borderRadius: 8,

    backgroundColor: '#F0FDFA',
  },

  reasonLabel: {
    fontSize: 10,
    fontWeight: '800',

    color: '#0F766E',
  },

  reasonText: {
    marginTop: 4,

    fontSize: 10,
    lineHeight: 16,

    color: '#64748B',
  },

  // =========================
  // SECURITY
  // =========================

  securityBox: {
    marginTop: 16,

    padding: 17,

    borderRadius: 16,

    borderWidth: 1,
    borderColor: '#CCFBF1',

    backgroundColor: '#F0FDFA',
  },

  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  securityIcon: {
    width: 42,
    height: 42,

    borderRadius: 13,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: '#FFFFFF',
  },

  securityTitle: {
    flex: 1,

    marginLeft: 11,

    fontSize: 14,
    fontWeight: '800',

    color: '#0F766E',
  },

  securityDescription: {
    marginTop: 12,

    fontSize: 10,
    lineHeight: 17,

    color: '#475569',
  },

  // =========================
  // SIMPLE TITLE
  // =========================

  simpleSectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',

    marginBottom: 7,
  },

  simpleSectionTitleText: {
    flex: 1,

    marginLeft: 11,

    fontSize: 14,
    fontWeight: '800',

    color: '#1E293B',
  },

  // =========================
  // REASON ITEM
  // =========================

  reasonItem: {
    marginTop: 11,

    flexDirection: 'row',

    padding: 11,

    borderRadius: 12,

    backgroundColor: '#F8FAFC',
  },

  reasonItemIcon: {
    width: 36,
    height: 36,

    borderRadius: 10,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: '#ECFDF5',
  },

  reasonItemContent: {
    flex: 1,

    marginLeft: 10,
  },

  reasonItemTitle: {
    fontSize: 11,
    fontWeight: '800',

    color: '#334155',
  },

  reasonItemDescription: {
    marginTop: 3,

    fontSize: 9,
    lineHeight: 15,

    color: '#64748B',
  },

  // =========================
  // INFO
  // =========================

  smallInfoBox: {
    marginTop: 12,

    padding: 12,

    flexDirection: 'row',
    alignItems: 'flex-start',

    borderRadius: 12,

    backgroundColor: '#F0FDFA',
  },

  smallInfoText: {
    flex: 1,

    marginLeft: 9,

    fontSize: 10,
    lineHeight: 16,

    color: '#475569',
  },

  // =========================
  // USER CONTROL
  // =========================

  controlItem: {
    marginTop: 11,

    flexDirection: 'row',
    alignItems: 'center',
  },

  controlCheck: {
    width: 19,
    height: 19,

    borderRadius: 10,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: '#0F9D8A',
  },

  controlText: {
    flex: 1,

    marginLeft: 9,

    fontSize: 10,
    lineHeight: 16,

    color: '#475569',
  },

  // =========================
  // CONSENT
  // =========================

  consentSection: {
    marginTop: 16,

    paddingHorizontal: 20,
    paddingVertical: 23,

    alignItems: 'center',

    borderRadius: 18,

    backgroundColor: '#ECFDF5',
  },

  consentTitle: {
    marginTop: 8,

    fontSize: 16,
    fontWeight: '900',

    color: '#0F766E',
  },

  consentDescription: {
    marginTop: 7,

    fontSize: 10,
    lineHeight: 17,

    textAlign: 'center',

    color: '#64748B',
  },

  backToRegisterButton: {
    height: 45,

    marginTop: 17,

    paddingHorizontal: 20,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    gap: 7,

    borderRadius: 12,

    backgroundColor: '#0F9D8A',
  },

  backToRegisterText: {
    fontSize: 11,
    fontWeight: '800',

    color: '#FFFFFF',
  },

  footerText: {
    marginTop: 22,

    fontSize: 9,

    textAlign: 'center',

    color: '#94A3B8',
  },
});