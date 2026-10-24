import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Alert,
  Animated,
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons/static';

import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

// =====================================================
// ROOM SIZE
// =====================================================

const ROOM_WIDTH_METERS = 5;
const ROOM_HEIGHT_METERS = 6;
const ROOM_PADDING = 8;

// =====================================================
// FURNITURE
// =====================================================

const FURNITURE_LIST = [
  {
    type: 'bed',
    name: 'เตียง',
    image: require('../assets/Bed.png'),
    realWidth: 1.8,
    realHeight: 2.0,
    imageScale: 1,
  },
  {
    type: 'sofa',
    name: 'โซฟา',
    image: require('../assets/Sofa.png'),
    realWidth: 2.2,
    realHeight: 0.9,
    imageScale: 1,
  },
  {
    type: 'table',
    name: 'โต๊ะ',
    image: require('../assets/Table.png'),
    realWidth: 2.0,
    realHeight: 0.75,
    imageScale: 1,
  },
  {
    type: 'cabinet',
    name: 'ตู้',
    image: require('../assets/Cabinet.png'),
    realWidth: 2.5,
    realHeight: 0.9,
    imageScale: 1,
  },
  {
    type: 'tv',
    name: 'ทีวี',
    image: require('../assets/TV.png'),
    realWidth: 1.4,
    realHeight: 0.5,
    imageScale: 1,
  },
  {
    type: 'plant',
    name: 'ต้นไม้',
    image: require('../assets/Plant.png'),
    realWidth: 0.7,
    realHeight: 0.7,
    imageScale: 1,
  },
];

// =====================================================
// BATHROOM
// =====================================================

const BATHROOM_LIST = [
  {
    type: 'toilet',
    name: 'ชักโครก',
    image: require('../assets/Toilet.png'),
    realWidth: 1.1,
    realHeight: 1.4,
    imageScale: 1.35,
  },
  {
    type: 'sink',
    name: 'อ่างล้างหน้า',
    image: require('../assets/Sink.png'),
    realWidth: 1.3,
    realHeight: 0.9,
    imageScale: 1.35,
  },
  {
    type: 'bathtub',
    name: 'อ่างอาบน้ำ',
    image: require('../assets/Bathtub.png'),
    realWidth: 1.2,
    realHeight: 2.2,
    imageScale: 1.25,
  },
];

// =====================================================
// FLOOR
// =====================================================

const FLOOR_OPTIONS = [
  {
    id: 'light-wood',
    name: 'ไม้สว่าง',
    color: '#D9B98C',
    lineColor: '#9B7044',
  },
  {
    id: 'dark-wood',
    name: 'ไม้เข้ม',
    color: '#8B6848',
    lineColor: '#4E3525',
  },
  {
    id: 'tile',
    name: 'กระเบื้อง',
    color: '#E7E5E4',
    lineColor: '#AAA5A0',
  },
  {
    id: 'marble',
    name: 'หินอ่อน',
    color: '#F1F1EF',
    lineColor: '#ADB3B7',
  },
  {
    id: 'concrete',
    name: 'ปูน',
    color: '#C9CDD1',
    lineColor: '#9299A0',
  },
];

// =====================================================
// WALL
// =====================================================

const WALL_OPTIONS = [
  {
    id: 'white',
    name: 'ขาว',
    color: '#FFFFFF',
  },
  {
    id: 'cream',
    name: 'ครีม',
    color: '#F5E6CC',
  },
  {
    id: 'gray',
    name: 'เทา',
    color: '#94A3B8',
  },
  {
    id: 'dark-gray',
    name: 'เทาเข้ม',
    color: '#475569',
  },
  {
    id: 'green',
    name: 'เขียว',
    color: '#86A789',
  },
  {
    id: 'blue',
    name: 'ฟ้า',
    color: '#7FA1C3',
  },
  {
    id: 'brown',
    name: 'น้ำตาล',
    color: '#9A7B5B',
  },
  {
    id: 'black',
    name: 'ดำ',
    color: '#1E293B',
  },
];

// =====================================================
// DRAGGABLE FURNITURE
// =====================================================

const DraggableFurniture = ({
  item,
  selected,
  canvasSize,
  onSelect,
  onMoveEnd,
}) => {
  const pan = useRef(
    new Animated.ValueXY({
      x: item.x,
      y: item.y,
    }),
  ).current;

  const startPosition = useRef({
    x: item.x,
    y: item.y,
  });

  // สำคัญตอน Load ข้อมูลกลับมา
  // ทำให้ตำแหน่ง Animated ตรงกับ item.x / item.y
  useEffect(() => {
    pan.setValue({
      x: item.x,
      y: item.y,
    });
  }, [item.x, item.y, pan]);

  const clampPosition = (x, y) => {
    const rotated =
      item.rotation % 180 !== 0;

    const visualWidth = rotated
      ? item.height
      : item.width;

    const visualHeight = rotated
      ? item.width
      : item.height;

    const maxX = Math.max(
      ROOM_PADDING,
      canvasSize.width -
        visualWidth -
        ROOM_PADDING,
    );

    const maxY = Math.max(
      ROOM_PADDING,
      canvasSize.height -
        visualHeight -
        ROOM_PADDING,
    );

    return {
      x: Math.min(
        Math.max(
          ROOM_PADDING,
          x,
        ),
        maxX,
      ),

      y: Math.min(
        Math.max(
          ROOM_PADDING,
          y,
        ),
        maxY,
      ),
    };
  };

  const interaction = useRef({item, onSelect, onMoveEnd, clampPosition});
  interaction.current = {item, onSelect, onMoveEnd, clampPosition};

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder:
        () => true,

      onMoveShouldSetPanResponder:
        () => true,

      onPanResponderGrant: () => {
        interaction.current.onSelect(interaction.current.item.id);

        startPosition.current = {
          x: pan.x.__getValue(),
          y: pan.y.__getValue(),
        };
      },

      onPanResponderMove: (
        _,
        gestureState,
      ) => {
        const nextX =
          startPosition.current.x +
          gestureState.dx;

        const nextY =
          startPosition.current.y +
          gestureState.dy;

        const limited =
          interaction.current.clampPosition(
            nextX,
            nextY,
          );

        pan.setValue({
          x: limited.x,
          y: limited.y,
        });
      },

      onPanResponderRelease: () => {
        const limited =
          interaction.current.clampPosition(
            pan.x.__getValue(),
            pan.y.__getValue(),
          );

        pan.setValue(limited);

        interaction.current.onMoveEnd(
          interaction.current.item.id,
          limited.x,
          limited.y,
        );
      },

      onPanResponderTerminate:
        () => {
          const limited =
            interaction.current.clampPosition(
              pan.x.__getValue(),
              pan.y.__getValue(),
            );

          pan.setValue(limited);

          interaction.current.onMoveEnd(
            interaction.current.item.id,
            limited.x,
            limited.y,
          );
        },
    }),
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.furnitureItem,
        {
          width: item.width,
          height: item.height,

          transform: [
            ...pan.getTranslateTransform(),
            {
              rotate: `${item.rotation}deg`,
            },
          ],
        },

        selected &&
          styles.furnitureItemSelected,
      ]}>

      <Image
        source={item.image}
        style={[
          styles.furnitureImage,
          {
            transform: [
              {
                scale:
                  item.imageScale ||
                  1,
              },
            ],
          },
        ]}
        resizeMode="contain"
      />

      {selected && (
        <View
          style={
            styles.selectedDot
          }>
          <MaterialDesignIcons
            name="check"
            size={12}
            color="#FFFFFF"
          />
        </View>
      )}

    </Animated.View>
  );
};

// =====================================================
// FLOOR BACKGROUND
// =====================================================

const FloorBackground = ({
  selectedFloor,
  canvasSize,
}) => {
  if (
    !selectedFloor ||
    canvasSize.width <= 0 ||
    canvasSize.height <= 0
  ) {
    return null;
  }

  const overlayStyle = {
    position: 'absolute',
    left: 0,
    top: 0,
    width: canvasSize.width,
    height: canvasSize.height,
    zIndex: 2,
  };

  // ===================================================
  // WOOD
  // ===================================================

  if (
    selectedFloor.id ===
      'light-wood' ||
    selectedFloor.id ===
      'dark-wood'
  ) {
    const rows = 12;

    const rowHeight =
      canvasSize.height / rows;

    return (
      <View
        pointerEvents="none"
        style={overlayStyle}>

        {Array.from({
          length: rows - 1,
        }).map((_, index) => (
          <View
            key={`wood-horizontal-${index}`}
            style={{
              position:
                'absolute',

              left: 0,
              right: 0,

              top:
                (index + 1) *
                rowHeight,

              height: 2,

              backgroundColor:
                selectedFloor.lineColor,

              opacity: 0.9,
            }}
          />
        ))}

        {Array.from({
          length: rows,
        }).map((_, row) => {
          let joints = [];

          if (row % 4 === 0) {
            joints = [
              0.3,
              0.68,
            ];
          } else if (
            row % 4 === 1
          ) {
            joints = [
              0.16,
              0.52,
              0.86,
            ];
          } else if (
            row % 4 === 2
          ) {
            joints = [
              0.39,
              0.77,
            ];
          } else {
            joints = [
              0.23,
              0.61,
              0.91,
            ];
          }

          return joints.map(
            (
              position,
              index,
            ) => (
              <View
                key={`wood-joint-${row}-${index}`}
                style={{
                  position:
                    'absolute',

                  left:
                    canvasSize.width *
                    position,

                  top:
                    row *
                    rowHeight,

                  width: 2,

                  height:
                    rowHeight,

                  backgroundColor:
                    selectedFloor.lineColor,

                  opacity: 0.85,
                }}
              />
            ),
          );
        })}

        {Array.from({
          length: rows,
        }).map((_, row) => {
          const rowTop =
            row * rowHeight;

          return (
            <React.Fragment
              key={`wood-grain-${row}`}>

              <View
                style={{
                  position:
                    'absolute',

                  top:
                    rowTop +
                    rowHeight *
                      0.25,

                  left:
                    canvasSize.width *
                    (0.05 +
                      (row % 4) *
                        0.03),

                  width:
                    canvasSize.width *
                    (0.23 +
                      (row % 3) *
                        0.05),

                  height: 1.5,

                  borderRadius: 10,

                  backgroundColor:
                    selectedFloor.lineColor,

                  opacity: 0.38,
                }}
              />

              <View
                style={{
                  position:
                    'absolute',

                  top:
                    rowTop +
                    rowHeight *
                      0.48,

                  left:
                    canvasSize.width *
                    (0.36 +
                      (row % 3) *
                        0.04),

                  width:
                    canvasSize.width *
                    (0.18 +
                      (row % 4) *
                        0.04),

                  height: 1.5,

                  borderRadius: 10,

                  backgroundColor:
                    selectedFloor.lineColor,

                  opacity: 0.3,
                }}
              />

              <View
                style={{
                  position:
                    'absolute',

                  top:
                    rowTop +
                    rowHeight *
                      0.72,

                  left:
                    canvasSize.width *
                    (0.58 -
                      (row % 3) *
                        0.03),

                  width:
                    canvasSize.width *
                    (0.25 +
                      (row % 2) *
                        0.06),

                  height: 1.5,

                  borderRadius: 10,

                  backgroundColor:
                    selectedFloor.lineColor,

                  opacity: 0.34,
                }}
              />

            </React.Fragment>
          );
        })}

      </View>
    );
  }

  // ===================================================
  // TILE
  // ===================================================

  if (
    selectedFloor.id === 'tile'
  ) {
    const columns = 8;
    const rows = 10;

    return (
      <View
        pointerEvents="none"
        style={overlayStyle}>

        {Array.from({
          length: columns - 1,
        }).map((_, index) => (
          <View
            key={`tile-v-${index}`}
            style={{
              position:
                'absolute',

              top: 0,
              bottom: 0,

              left:
                ((index + 1) *
                  canvasSize.width) /
                columns,

              width: 1.5,

              backgroundColor:
                selectedFloor.lineColor,

              opacity: 0.65,
            }}
          />
        ))}

        {Array.from({
          length: rows - 1,
        }).map((_, index) => (
          <View
            key={`tile-h-${index}`}
            style={{
              position:
                'absolute',

              left: 0,
              right: 0,

              top:
                ((index + 1) *
                  canvasSize.height) /
                rows,

              height: 1.5,

              backgroundColor:
                selectedFloor.lineColor,

              opacity: 0.65,
            }}
          />
        ))}

      </View>
    );
  }

  // ===================================================
  // MARBLE
  // ===================================================

  if (
    selectedFloor.id ===
    'marble'
  ) {
    return (
      <View
        pointerEvents="none"
        style={overlayStyle}>

        <View
          style={[
            styles.marbleLine,
            {
              top:
                canvasSize.height *
                0.18,

              left:
                -canvasSize.width *
                0.1,

              width:
                canvasSize.width *
                0.85,

              backgroundColor:
                selectedFloor.lineColor,

              transform: [
                {
                  rotate:
                    '-20deg',
                },
              ],
            },
          ]}
        />

        <View
          style={[
            styles.marbleThinLine,
            {
              top:
                canvasSize.height *
                0.28,

              left:
                canvasSize.width *
                0.1,

              width:
                canvasSize.width *
                0.6,

              backgroundColor:
                selectedFloor.lineColor,

              transform: [
                {
                  rotate:
                    '-15deg',
                },
              ],
            },
          ]}
        />

        <View
          style={[
            styles.marbleLine,
            {
              top:
                canvasSize.height *
                0.48,

              right:
                -canvasSize.width *
                0.15,

              width:
                canvasSize.width *
                0.95,

              backgroundColor:
                selectedFloor.lineColor,

              transform: [
                {
                  rotate:
                    '25deg',
                },
              ],
            },
          ]}
        />

        <View
          style={[
            styles.marbleThinLine,
            {
              top:
                canvasSize.height *
                0.62,

              right:
                canvasSize.width *
                0.05,

              width:
                canvasSize.width *
                0.55,

              backgroundColor:
                selectedFloor.lineColor,

              transform: [
                {
                  rotate:
                    '18deg',
                },
              ],
            },
          ]}
        />

        <View
          style={[
            styles.marbleLine,
            {
              top:
                canvasSize.height *
                0.75,

              left:
                -canvasSize.width *
                0.05,

              width:
                canvasSize.width *
                0.7,

              backgroundColor:
                selectedFloor.lineColor,

              transform: [
                {
                  rotate:
                    '-12deg',
                },
              ],
            },
          ]}
        />

      </View>
    );
  }

  // ===================================================
  // CONCRETE
  // ===================================================

  if (
    selectedFloor.id ===
    'concrete'
  ) {
    return (
      <View
        pointerEvents="none"
        style={overlayStyle}>

        <View
          style={[
            styles.concretePatch,
            {
              top:
                canvasSize.height *
                0.15,

              left:
                canvasSize.width *
                0.1,
            },
          ]}
        />

        <View
          style={[
            styles.concretePatch,
            {
              top:
                canvasSize.height *
                0.5,

              right:
                canvasSize.width *
                0.12,
            },
          ]}
        />

        <View
          style={[
            styles.concretePatch,
            {
              bottom:
                canvasSize.height *
                0.12,

              left:
                canvasSize.width *
                0.25,
            },
          ]}
        />

      </View>
    );
  }

  return null;
};

// =====================================================
// SCREEN
// =====================================================

const RoomCustomizerScreen = ({
  navigation,
  route,
}) => {
  const insets =
    useSafeAreaInsets();

  const {
    room,
    floor,
    propertyId,
  } = route.params || {};

  const [
    selectedTool,
    setSelectedTool,
  ] = useState('furniture');

  const [
    furniture,
    setFurniture,
  ] = useState([]);

  const [
    selectedFurnitureId,
    setSelectedFurnitureId,
  ] = useState(null);

  const [
    canvasSize,
    setCanvasSize,
  ] = useState({
    width: 0,
    height: 0,
  });

  const [
    selectedFloor,
    setSelectedFloor,
  ] = useState(
    FLOOR_OPTIONS[0],
  );

  const [
    selectedWall,
    setSelectedWall,
  ] = useState(
    WALL_OPTIONS[0],
  );

  const roomName =
    room?.name ||
    'ห้องของคุณ';

  // =====================================================
  // STORAGE KEY
  // =====================================================

  // Keep each property's room design separate, even when room names repeat.
  const storageKey = useMemo(() => {
    const safePart = value => encodeURIComponent(String(value ?? 'unknown'));
    const houseId = propertyId || 'unknown-property';
    const floorId = floor ?? 'no-floor';
    const roomId = room?._id || room?.id || room?.name || 'room';
    return `@homematch_room_design_v2_${safePart(houseId)}_${safePart(floorId)}_${safePart(roomId)}`;
  }, [propertyId, floor, room?._id, room?.id, room?.name]);

  const [catalog, setCatalog] = useState(null);
  const [catalogError, setCatalogError] = useState(false);
  useEffect(() => {
    let active = true;
    api.get('/room-designs/catalog').then(response => {
      if (active) {setCatalog(Array.isArray(response.data?.items) ? response.data.items : []); setCatalogError(false);}
    }).catch(() => {if (active) setCatalogError(true);});
    return () => {active = false;};
  }, []);
  const furniturePrices = useMemo(() => new Map((catalog || []).filter(item=>item.category==='furniture').map(item=>[item.key,item.unitPrice])), [catalog]);
  const furniturePriceLabel = type => {
    if (catalogError) return 'โหลดราคาไม่สำเร็จ';
    if (catalog === null) return 'กำลังโหลดราคา...';
    const price = furniturePrices.get(type);
    return typeof price === 'number' ? `≈ ${price.toLocaleString('th-TH')} บาท` : 'ยังไม่มีข้อมูลราคา';
  };
  const designUpdatedAt = useRef(null);
  const [loadRevision, setLoadRevision] = useState(0);
  const [designLoading, setDesignLoading] = useState(true);
  const [designSaving, setDesignSaving] = useState(false);
  const [designLoadFailed, setDesignLoadFailed] = useState(false);
  const roomId = String(room?._id || room?.id || room?.name || 'room');
  const canSync = Boolean(propertyId && floor !== undefined && floor !== null && roomId);
  const apiParams = useMemo(() => ({ propertyId, floor: String(floor ?? ''), roomId }), [propertyId, floor, roomId]);

  // =====================================================
  // SCALE
  // =====================================================

  const scale = useMemo(() => {
    if (
      canvasSize.width <= 0 ||
      canvasSize.height <= 0
    ) {
      return 0;
    }

    const usableWidth =
      canvasSize.width -
      ROOM_PADDING * 2;

    const usableHeight =
      canvasSize.height -
      ROOM_PADDING * 2;

    const scaleX =
      usableWidth /
      ROOM_WIDTH_METERS;

    const scaleY =
      usableHeight /
      ROOM_HEIGHT_METERS;

    return Math.min(
      scaleX,
      scaleY,
    );
  }, [
    canvasSize.width,
    canvasSize.height,
  ]);

  // =====================================================
  // LOAD SAVED DESIGN
  // =====================================================

  useEffect(() => {
    let active = true;
    setDesignLoading(true);
    setDesignLoadFailed(false);
    designUpdatedAt.current = null;
    setFurniture([]);
    setSelectedFurnitureId(null);
    setSelectedFloor(FLOOR_OPTIONS[0]);
    setSelectedWall(WALL_OPTIONS[0]);

    const loadSavedDesign =
      async () => {
        try {
          let design = null;
          if (canSync) {
            // MongoDB is authoritative when signed in and connected.
            const response = await api.get('/room-designs', { params: apiParams });
            design = response.data?.design || null;
          } else {
            const savedData = await AsyncStorage.getItem(storageKey);
            design = savedData ? JSON.parse(savedData) : null;
          }
          if (!active || !design) return;
          designUpdatedAt.current = design.updatedAt || null;
          if (!active) return;

          // -------------------------
          // FLOOR
          // -------------------------

          if (
            design
              .selectedFloor
              ?.id
          ) {
            const savedFloor =
              FLOOR_OPTIONS.find(
                item =>
                  item.id ===
                  design
                    .selectedFloor
                    .id,
              );

            if (savedFloor) {
              setSelectedFloor(
                savedFloor,
              );
            }
          }

          // -------------------------
          // WALL
          // -------------------------

          if (
            design
              .selectedWall
              ?.id
          ) {
            const savedWall =
              WALL_OPTIONS.find(
                item =>
                  item.id ===
                  design
                    .selectedWall
                    .id,
              );

            if (savedWall) {
              setSelectedWall(
                savedWall,
              );
            }
          }

          // -------------------------
          // FURNITURE
          // -------------------------

          if (
            Array.isArray(
              design.furniture,
            )
          ) {
            const allAssets = [
              ...FURNITURE_LIST,
              ...BATHROOM_LIST,
            ];

            const restored =
              design.furniture
                .map(savedItem => {
                  const asset =
                    allAssets.find(
                      item =>
                        item.type ===
                        savedItem.type,
                    );

                  if (!asset) {
                    return {...savedItem, image: undefined, imageScale: 1};
                  }

                  return {
                    id:
                      savedItem.id ||
                      `${Date.now()}-${Math.random()}`,

                    type:
                      asset.type,

                    name:
                      asset.name,

                    image:
                      asset.image,

                    realWidth:
                      savedItem.realWidth ?? asset.realWidth,

                    realHeight:
                      savedItem.realHeight ?? asset.realHeight,

                    imageScale:
                      asset.imageScale ||
                      1,

                    width:
                      savedItem.width ||
                      0,

                    height:
                      savedItem.height ||
                      0,

                    x:
                      savedItem.x ??
                      ROOM_PADDING,

                    y:
                      savedItem.y ??
                      ROOM_PADDING,

                    rotation:
                      savedItem.rotation ||
                      0,
                  };
                })
                .filter(Boolean);

            setFurniture(
              restored,
            );
          }

          setSelectedFurnitureId(
            null,
          );

          console.log(
            'LOAD ROOM DESIGN:',
            design,
          );
        } catch (error) {
          if (active) {
            setDesignLoadFailed(true);
            console.log('LOAD DESIGN ERROR:', error);
            Alert.alert('โหลดแบบไม่สำเร็จ', 'ตรวจสอบการเข้าสู่ระบบและการเชื่อมต่อ Backend');
          }
        } finally {
          if (active) setDesignLoading(false);
        }
      };

    loadSavedDesign();
    return () => { active = false; };
  }, [storageKey, canSync, apiParams, loadRevision]);

  // =====================================================
  // RESTORE SIZE AFTER CANVAS READY
  // =====================================================

  useEffect(() => {
    if (scale <= 0) {
      return;
    }

    setFurniture(current =>
      current.map(item => {
        if (
          item.width > 0 &&
          item.height > 0
        ) {
          return item;
        }

        return {
          ...item,

          width:
            item.realWidth *
            scale,

          height:
            item.realHeight *
            scale,
        };
      }),
    );
  }, [scale]);

  // =====================================================
  // TOOLS
  // =====================================================

  const tools = [
    {
      id: 'furniture',
      title: 'เฟอร์นิเจอร์',
      icon: 'sofa-outline',
    },
    {
      id: 'bathroom',
      title: 'ห้องน้ำ',
      icon: 'shower',
    },
    {
      id: 'floor',
      title: 'พื้น',
      icon: 'floor-plan',
    },
    {
      id: 'wall',
      title: 'ผนัง',
      icon: 'wall',
    },
  ];

  // =====================================================
  // ADD FURNITURE
  // =====================================================

  const handleAddFurniture =
    itemData => {
      if (designLoading || designSaving || designLoadFailed) return;
      if (
        canvasSize.width <= 0 ||
        canvasSize.height <= 0 ||
        scale <= 0
      ) {
        return;
      }

      const itemWidth =
        itemData.realWidth *
        scale;

      const itemHeight =
        itemData.realHeight *
        scale;

      let startX =
        canvasSize.width / 2 -
        itemWidth / 2;

      let startY =
        canvasSize.height / 2 -
        itemHeight / 2;

      startX = Math.max(
        ROOM_PADDING,
        Math.min(
          startX,
          canvasSize.width -
            itemWidth -
            ROOM_PADDING,
        ),
      );

      startY = Math.max(
        ROOM_PADDING,
        Math.min(
          startY,
          canvasSize.height -
            itemHeight -
            ROOM_PADDING,
        ),
      );

      const newItem = {
        id:
          `${Date.now()}-${Math.random()}`,

        type:
          itemData.type,

        name:
          itemData.name,

        image:
          itemData.image,

        realWidth:
          itemData.realWidth,

        realHeight:
          itemData.realHeight,

        imageScale:
          itemData.imageScale ||
          1,

        width:
          itemWidth,

        height:
          itemHeight,

        x:
          startX,

        y:
          startY,

        rotation: 0,
      };

      setFurniture(
        current => [
          ...current,
          newItem,
        ],
      );

      setSelectedFurnitureId(
        newItem.id,
      );
    };

  // =====================================================
  // MOVE
  // =====================================================

  const handleMoveFurniture = (
    id,
    x,
    y,
  ) => {
    if (designLoading || designSaving || designLoadFailed) return;
    setFurniture(current =>
      current.map(item =>
        item.id === id
          ? {
              ...item,
              x,
              y,
            }
          : item,
      ),
    );
  };

  // =====================================================
  // ROTATE
  // =====================================================

  const handleRotateFurniture =
    () => {
      if (designLoading || designSaving || designLoadFailed) return;
      if (
        !selectedFurnitureId
      ) {
        Alert.alert(
          'ยังไม่ได้เลือก',
          'กรุณาเลือกเฟอร์นิเจอร์ที่ต้องการหมุน',
        );

        return;
      }

      setFurniture(current =>
        current.map(item =>
          item.id ===
          selectedFurnitureId
            ? {
                ...item,

                rotation:
                  (item.rotation +
                    90) %
                  360,
              }
            : item,
        ),
      );
    };

  // =====================================================
  // DELETE
  // =====================================================

  const handleDeleteFurniture =
    () => {
      if (designLoading || designSaving || designLoadFailed) return;
      if (
        !selectedFurnitureId
      ) {
        return;
      }

      setFurniture(current =>
        current.filter(
          item =>
            item.id !==
            selectedFurnitureId,
        ),
      );

      setSelectedFurnitureId(
        null,
      );
    };

  // =====================================================
  // RESET + DELETE SAVED DESIGN
  // =====================================================

  const handleReset = () => {
    if (designLoading || designSaving || designLoadFailed) return;
    if (
      furniture.length === 0 &&
      selectedFloor.id ===
        FLOOR_OPTIONS[0].id &&
      selectedWall.id ===
        WALL_OPTIONS[0].id
    ) {
      return;
    }

    Alert.alert(
      'รีเซ็ตการออกแบบ',
      'ต้องการรีเซ็ตการออกแบบห้องทั้งหมดหรือไม่?',
      [
        {
          text: 'ยกเลิก',
          style: 'cancel',
        },
        {
          text: 'รีเซ็ต',
          style: 'destructive',

          onPress: async () => {
            try {
              if (canSync) {
                await api.delete('/room-designs', { params: apiParams });
                designUpdatedAt.current = null;
              }
              await AsyncStorage.removeItem(storageKey);

              // ลบเฟอร์นิเจอร์
              setFurniture([]);

              // ยกเลิกการเลือก
              setSelectedFurnitureId(
                null,
              );

              // พื้นเริ่มต้น
              setSelectedFloor(
                FLOOR_OPTIONS[0],
              );

              // ผนังเริ่มต้น
              setSelectedWall(
                WALL_OPTIONS[0],
              );

              console.log(
                'ROOM DESIGN RESET',
              );
            } catch (error) {
              console.log(
                'RESET DESIGN ERROR:',
                error,
              );

              Alert.alert(
                'เกิดข้อผิดพลาด',
                'ไม่สามารถรีเซ็ตแบบห้องได้',
              );
            }
          },
        },
      ],
    );
  };

  // =====================================================
  // SAVE TO ASYNC STORAGE
  // =====================================================

  const handleFinish = () => {
    if (designLoading || designSaving || designLoadFailed) return;
    if (!canSync) {
      Alert.alert('ยังเปิดสรุปราคาไม่ได้', 'กรุณาเปิดห้องจากประกาศบ้านและเข้าสู่ระบบก่อน');
      return;
    }
    Alert.alert('เสร็จสิ้นการออกแบบ', 'บันทึกแบบล่าสุดและเปิดสรุปราคาประมาณการ?', [
      {text:'ยกเลิก',style:'cancel'},
      {text:'บันทึกและดูราคา',onPress:() => handleSave(true)},
    ]);
  };

  const handleSave = async (finish = false) => {
    if (designLoading || designSaving || designLoadFailed) return;
    setDesignSaving(true);
    try {
      const designData = {
        propertyId: propertyId || null,
        expectedUpdatedAt: designUpdatedAt.current,
        canvasSize: {...canvasSize},
        room:
          roomName,

        roomId,

        floor,

        roomSize: {
          width:
            ROOM_WIDTH_METERS,

          height:
            ROOM_HEIGHT_METERS,

          unit:
            'meter',
        },

        selectedFloor: {
          id:
            selectedFloor.id,

          name:
            selectedFloor.name,
        },

        selectedWall: {
          id:
            selectedWall.id,

          name:
            selectedWall.name,

          color:
            selectedWall.color,
        },

        furniture:
          furniture.map(
            item => ({
              id:
                item.id,

              type:
                item.type,

              name:
                item.name,

              realWidth:
                item.realWidth,

              realHeight:
                item.realHeight,

              width:
                item.width,

              height:
                item.height,

              x:
                item.x,

              y:
                item.y,

              rotation:
                item.rotation,
            }),
          ),

        updatedAt:
          new Date()
            .toISOString(),
      };

      if (canSync) {
        const response = await api.put('/room-designs', designData);
        if (!response.data?.status || !response.data?.design?._id) throw new Error('SAVE_NOT_CONFIRMED');
        designUpdatedAt.current = response.data.design.updatedAt;
        if (finish) {
          navigation.navigate('DesignPriceSummary', {designId:response.data.design._id});
          return;
        }
      } else {
        await AsyncStorage.setItem(storageKey, JSON.stringify(designData));
      }

      console.log(
        'ROOM DESIGN SAVED:',
        designData,
      );

      Alert.alert(
        'บันทึกสำเร็จ',
        `บันทึกการออกแบบห้องแล้ว\n\nพื้น: ${selectedFloor.name}\nผนัง: ${selectedWall.name}\nอุปกรณ์: ${furniture.length} ชิ้น`,
      );
    } catch (error) {
      const conflict = error.response?.status === 409;
      Alert.alert(
        'บันทึกแบบไม่สำเร็จ',
        error.response?.data?.message || 'ไม่สามารถบันทึกแบบห้องได้ กรุณาตรวจสอบการเชื่อมต่อ',
        conflict ? [
          {text:'เก็บการแก้ไขไว้',style:'cancel'},
          {text:'โหลดแบบล่าสุด',onPress:()=>setLoadRevision(value=>value+1)},
        ] : [{text:'ตกลง'}],
      );
    } finally {
      setDesignSaving(false);
    }
  };

  // =====================================================
  // ASSET LIST
  // =====================================================

  const renderAssetList =
    list => {
      return (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.furnitureList
          }>

          {list.map(item => (
            <Pressable
              key={item.type}
              style={
                styles.furnitureChoice
              }
              onPress={() =>
                handleAddFurniture(
                  item,
                )
              }>

              <View
                style={
                  styles.choiceImageContainer
                }>

                <Image
                  source={
                    item.image
                  }
                  style={
                    styles.choiceImage
                  }
                  resizeMode="contain"
                />

              </View>

              <Text
                style={
                  styles.choiceName
                }>

                {item.name}

              </Text>

              <Text
                style={
                  styles.choiceSize
                }>

                {item.realWidth} ×{' '}
                {item.realHeight} ม.

              </Text>
              <Text style={styles.choicePrice}>{furniturePriceLabel(item.type)}</Text>

              <View
                style={
                  styles.plusBadge
                }>

                <MaterialDesignIcons
                  name="plus"
                  size={13}
                  color="#FFFFFF"
                />

              </View>

            </Pressable>
          ))}

        </ScrollView>
      );
    };

  // =====================================================
  // FLOOR PREVIEW
  // =====================================================

  const renderFloorPreview =
    floorItem => {
      if (
        floorItem.id ===
          'light-wood' ||
        floorItem.id ===
          'dark-wood'
      ) {
        return (
          <>
            {[12, 25, 38].map(
              (top, index) => (
                <View
                  key={`preview-row-${index}`}
                  style={[
                    styles.previewWoodLine,
                    {
                      top,

                      backgroundColor:
                        floorItem.lineColor,
                    },
                  ]}
                />
              ),
            )}

            <View
              style={[
                styles.previewWoodJoint,
                {
                  left: 20,
                  top: 0,
                  height: 13,

                  backgroundColor:
                    floorItem.lineColor,
                },
              ]}
            />

            <View
              style={[
                styles.previewWoodJoint,
                {
                  left: 44,
                  top: 13,
                  height: 13,

                  backgroundColor:
                    floorItem.lineColor,
                },
              ]}
            />

            <View
              style={[
                styles.previewWoodJoint,
                {
                  left: 28,
                  top: 26,
                  height: 13,

                  backgroundColor:
                    floorItem.lineColor,
                },
              ]}
            />

            <View
              style={[
                styles.previewWoodGrain,
                {
                  top: 7,
                  left: 5,

                  backgroundColor:
                    floorItem.lineColor,
                },
              ]}
            />

            <View
              style={[
                styles.previewWoodGrain,
                {
                  top: 32,
                  left: 35,

                  backgroundColor:
                    floorItem.lineColor,
                },
              ]}
            />
          </>
        );
      }

      if (
        floorItem.id ===
        'tile'
      ) {
        return (
          <>
            <View
              style={[
                styles.previewVertical,
                {
                  backgroundColor:
                    floorItem.lineColor,
                },
              ]}
            />

            <View
              style={[
                styles.previewHorizontal,
                {
                  backgroundColor:
                    floorItem.lineColor,
                },
              ]}
            />
          </>
        );
      }

      if (
        floorItem.id ===
        'marble'
      ) {
        return (
          <>
            <View
              style={[
                styles.previewMarbleLine,
                {
                  backgroundColor:
                    floorItem.lineColor,
                },
              ]}
            />

            <View
              style={[
                styles.previewMarbleLineTwo,
                {
                  backgroundColor:
                    floorItem.lineColor,
                },
              ]}
            />
          </>
        );
      }

      if (
        floorItem.id ===
        'concrete'
      ) {
        return (
          <>
            <View
              style={
                styles.previewConcreteOne
              }
            />

            <View
              style={
                styles.previewConcreteTwo
              }
            />
          </>
        );
      }

      return null;
    };

  // =====================================================
  // FLOOR LIST
  // =====================================================

  const renderFloorList =
    () => {
      return (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.floorList
          }>

          {FLOOR_OPTIONS.map(
            floorItem => {
              const active =
                selectedFloor.id ===
                floorItem.id;

              return (
                <Pressable
                  key={
                    floorItem.id
                  }
                  style={[
                    styles.floorChoice,

                    active &&
                      styles.floorChoiceActive,
                  ]}
                  onPress={() => {
                    if (designLoading || designSaving || designLoadFailed) return;
                    setSelectedFloor(
                      floorItem,
                    );

                    setSelectedFurnitureId(
                      null,
                    );
                  }}>

                  <View
                    style={[
                      styles.floorPreview,
                      {
                        backgroundColor:
                          floorItem.color,
                      },
                    ]}>

                    {renderFloorPreview(
                      floorItem,
                    )}

                    {active && (
                      <View
                        style={
                          styles.floorSelectedIcon
                        }>

                        <MaterialDesignIcons
                          name="check"
                          size={13}
                          color="#FFFFFF"
                        />

                      </View>
                    )}

                  </View>

                  <Text
                    style={[
                      styles.floorName,

                      active &&
                        styles.floorNameActive,
                    ]}>

                    {floorItem.name}

                  </Text>

                </Pressable>
              );
            },
          )}

        </ScrollView>
      );
    };

  // =====================================================
  // WALL LIST
  // =====================================================

  const renderWallList = () => {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.wallList
        }>

        {WALL_OPTIONS.map(
          wallItem => {
            const active =
              selectedWall.id ===
              wallItem.id;

            return (
              <Pressable
                key={
                  wallItem.id
                }
                style={[
                  styles.wallChoice,

                  active &&
                    styles.wallChoiceActive,
                ]}
                onPress={() => {
                  if (designLoading || designSaving || designLoadFailed) return;
                  setSelectedWall(
                    wallItem,
                  );

                  setSelectedFurnitureId(
                    null,
                  );
                }}>

                <View
                  style={[
                    styles.wallColorCircle,
                    {
                      backgroundColor:
                        wallItem.color,
                    },
                  ]}>

                  {active && (
                    <View
                      style={
                        styles.wallSelectedIcon
                      }>

                      <MaterialDesignIcons
                        name="check"
                        size={14}
                        color="#FFFFFF"
                      />

                    </View>
                  )}

                </View>

                <Text
                  style={[
                    styles.wallName,

                    active &&
                      styles.wallNameActive,
                  ]}>

                  {wallItem.name}

                </Text>

              </Pressable>
            );
          },
        )}

      </ScrollView>
    );
  };
  // =====================================================
  // UI
  // =====================================================

    return (
    <SafeAreaView
      style={styles.container}
      edges={[
        'left',
        'right',
        'bottom',
      ]}>

      {/* HEADER */}

      <View
        style={[
          styles.header,
          {
            paddingTop:
              insets.top + 8,

            height:
              70 +
              insets.top +
              8,
          },
        ]}>

        <Pressable
          style={
            styles.headerButton
          }
          onPress={() =>
            navigation.goBack()
          }>

          <MaterialDesignIcons
            name="chevron-left"
            size={30}
            color="#1E293B"
          />

        </Pressable>

        <View
          style={
            styles.headerContent
          }>

          <Text
            style={
              styles.headerTitle
            }
            numberOfLines={1}>

            {roomName}

          </Text>

          <Text
            style={
              styles.headerSubtitle
            }>

            {floor
              ? `ชั้น ${floor} • ${ROOM_WIDTH_METERS} × ${ROOM_HEIGHT_METERS} เมตร (ขนาดจำลอง)`
              : `${ROOM_WIDTH_METERS} × ${ROOM_HEIGHT_METERS} เมตร (ขนาดจำลอง)`}

          </Text>

        </View>

        <Pressable
          style={
            styles.headerButton
          }
          onPress={
            handleReset
          }>

          <MaterialDesignIcons
            name="refresh"
            size={22}
            color="#64748B"
          />

        </Pressable>

      </View>

      {/* MAIN */}

      <View
        style={
          styles.mainContent
        }>

        {/* ROOM INFO */}

        <View
          style={
            styles.roomInfo
          }>

          <View
            style={
              styles.roomIcon
            }>

            <MaterialDesignIcons
              name="floor-plan"
              size={22}
              color="#0F766E"
            />

          </View>

          <View
            style={
              styles.roomInfoContent
            }>

            <Text
              style={
                styles.roomName
              }>

              {roomName}

            </Text>

            <Text
              style={
                styles.roomDescription
              }>

              ขนาดห้อง{' '}
              {ROOM_WIDTH_METERS} ×{' '}
              {ROOM_HEIGHT_METERS}{' '}
              เมตร

            </Text>

          </View>

          {floor && (
            <View
              style={
                styles.floorBadge
              }>

              <Text
                style={
                  styles.floorBadgeText
                }>

                ชั้น {floor}

              </Text>

            </View>
          )}

        </View>

        {/* CANVAS HEADER */}

        <View
          style={
            styles.canvasHeader
          }>

          <View>

            <Text
              style={
                styles.canvasTitle
              }>

              พื้นที่ออกแบบ

            </Text>

            <Text
              style={
                styles.canvasSubtitle
              }>

              พื้น: {selectedFloor.name}
              {' • '}
              ผนัง: {selectedWall.name}

            </Text>

          </View>

          <View
            style={
              styles.itemCount
            }>

            <MaterialDesignIcons
              name="sofa-outline"
              size={14}
              color="#0F766E"
            />

            <Text
              style={
                styles.itemCountText
              }>

              {furniture.length} ชิ้น

            </Text>

          </View>

        </View>

        {/* CANVAS */}

        <View
          style={
            styles.canvasArea
          }>

          <Pressable
            style={[
              styles.canvas,
              {
                aspectRatio:
                  ROOM_WIDTH_METERS /
                  ROOM_HEIGHT_METERS,

                backgroundColor:
                  selectedFloor?.color ||
                  '#F8F5EF',

                borderColor:
                  selectedWall?.color ||
                  '#FFFFFF',
              },
            ]}
            onLayout={event => {
              const {
                width,
                height,
              } =
                event.nativeEvent
                  .layout;

              setCanvasSize({
                width,
                height,
              });
            }}
            onPress={() =>
              setSelectedFurnitureId(
                null,
              )
            }>

            {/* FLOOR */}

            <FloorBackground
              selectedFloor={
                selectedFloor
              }
              canvasSize={
                canvasSize
              }
            />

            {/* GRID */}

            <View
              pointerEvents="none"
              style={[
                styles.gridContainer,
                {
                  zIndex: 3,
                },
              ]}>

              {Array.from({
                length:
                  ROOM_WIDTH_METERS -
                  1,
              }).map(
                (_, index) => (
                  <View
                    key={`vertical-${index}`}
                    style={[
                      styles.verticalGrid,
                      {
                        left: `${
                          ((index +
                            1) /
                            ROOM_WIDTH_METERS) *
                          100
                        }%`,
                      },
                    ]}
                  />
                ),
              )}

              {Array.from({
                length:
                  ROOM_HEIGHT_METERS -
                  1,
              }).map(
                (_, index) => (
                  <View
                    key={`horizontal-${index}`}
                    style={[
                      styles.horizontalGrid,
                      {
                        top: `${
                          ((index +
                            1) /
                            ROOM_HEIGHT_METERS) *
                          100
                        }%`,
                      },
                    ]}
                  />
                ),
              )}

            </View>

            {/* ROOM SIZE */}

            <View
              pointerEvents="none"
              style={
                styles.roomLabel
              }>

              <MaterialDesignIcons
                name="floor-plan"
                size={14}
                color="#64748B"
              />

              <Text
                style={
                  styles.roomLabelText
                }>

                {ROOM_WIDTH_METERS} ×{' '}
                {ROOM_HEIGHT_METERS} ม.

              </Text>

            </View>

            {/* SCALE */}

            {scale > 0 && (
              <View
                pointerEvents="none"
                style={
                  styles.scaleLabel
                }>

                <Text
                  style={
                    styles.scaleLabelText
                  }>

                  1 ม. ≈{' '}
                  {Math.round(
                    scale,
                  )}{' '}
                  px

                </Text>

              </View>
            )}

            {/* EMPTY */}

            {furniture.length ===
              0 && (
              <View
                pointerEvents="none"
                style={
                  styles.emptyCanvas
                }>

                <View
                  style={
                    styles.emptyIcon
                  }>

                  <MaterialDesignIcons
                    name="sofa-outline"
                    size={45}
                    color="#0F9D8A"
                  />

                </View>

                <Text
                  style={
                    styles.emptyTitle
                  }>

                  ห้องยังว่างอยู่

                </Text>

                <Text
                  style={
                    styles.emptyText
                  }>

                  เลือกเฟอร์นิเจอร์หรืออุปกรณ์ด้านล่าง

                </Text>

              </View>
            )}

            {/* FURNITURE */}

            {furniture.map(
              item => (
                <DraggableFurniture
                  key={item.id}
                  item={item}
                  canvasSize={
                    canvasSize
                  }
                  selected={
                    selectedFurnitureId ===
                    item.id
                  }
                  onSelect={
                    setSelectedFurnitureId
                  }
                  onMoveEnd={
                    handleMoveFurniture
                  }
                />
              ),
            )}

          </Pressable>

        </View>

        {/* ITEM ACTION */}

        {selectedFurnitureId && (
          <View
            style={
              styles.itemActions
            }>

            <View
              style={
                styles.selectedItemLabel
              }>

              <MaterialDesignIcons
                name="cursor-move"
                size={18}
                color="#0F766E"
              />

              <Text
                style={
                  styles.selectedItemText
                }>

                ลากเพื่อย้าย

              </Text>

            </View>

            <Pressable
              style={
                styles.actionButton
              }
              onPress={
                handleRotateFurniture
              }>

              <MaterialDesignIcons
                name="rotate-right"
                size={20}
                color="#475569"
              />

              <Text
                style={
                  styles.actionText
                }>

                หมุน 90°

              </Text>

            </Pressable>

            <Pressable
              style={
                styles.deleteButton
              }
              onPress={
                handleDeleteFurniture
              }>

              <MaterialDesignIcons
                name="delete-outline"
                size={20}
                color="#EF4444"
              />

            </Pressable>

          </View>
        )}

      </View>

      {/* TOOL PANEL */}

      <View
        style={
          styles.toolPanel
        }>

        <View
          style={
            styles.toolTabs
          }>

          {tools.map(tool => {
            const active =
              selectedTool ===
              tool.id;

            return (
              <Pressable
                key={tool.id}
                style={[
                  styles.toolTab,

                  active &&
                    styles.toolTabActive,
                ]}
                onPress={() =>
                  setSelectedTool(
                    tool.id,
                  )
                }>

                <MaterialDesignIcons
                  name={
                    tool.icon
                  }
                  size={21}
                  color={
                    active
                      ? '#0F766E'
                      : '#94A3B8'
                  }
                />

                <Text
                  style={[
                    styles.toolTabText,

                    active &&
                      styles.toolTabTextActive,
                  ]}>

                  {tool.title}

                </Text>

              </Pressable>
            );
          })}

        </View>

        {selectedTool ===
          'furniture' &&
          renderAssetList(
            FURNITURE_LIST,
          )}

        {selectedTool ===
          'bathroom' &&
          renderAssetList(
            BATHROOM_LIST,
          )}

        {selectedTool ===
          'floor' &&
          renderFloorList()}

        {selectedTool ===
          'wall' &&
          renderWallList()}

      </View>

      {/* BOTTOM */}

      <View
        style={
          styles.bottomBar
        }>

        <Pressable
          style={
            styles.resetButton
          }
          onPress={
            handleReset
          }>

          <MaterialDesignIcons
            name="refresh"
            size={20}
            color="#64748B"
          />

          <Text
            style={
              styles.resetText
            }>

            รีเซ็ต

          </Text>

        </Pressable>

        <Pressable
          style={
            styles.saveButton
          }
          onPress={
            () => handleSave()
          }>

          <MaterialDesignIcons
            name="content-save-outline"
            size={20}
            color="#FFFFFF"
          />

          <Text
            style={
              styles.saveText
            }>

            บันทึกแบบ

          </Text>

        </Pressable>

      </View>

      <Pressable
        disabled={designLoading || designSaving || designLoadFailed}
        onPress={handleFinish}
        style={{marginHorizontal:20,marginBottom:8,padding:12,borderRadius:12,backgroundColor:'#0F9D8A',opacity:designLoading || designSaving ? 0.5 : 1}}
        accessibilityRole="button">
        <Text style={{color:'#FFFFFF',fontWeight:'700',textAlign:'center'}}>
          {designLoadFailed ? 'โหลดแบบไม่สำเร็จ กรุณาเปิดห้องใหม่' : designSaving ? 'กำลังบันทึกแบบ...' : 'เสร็จสิ้นการออกแบบ'}
        </Text>
      </Pressable>
    </SafeAreaView>
  );
};

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // ===================================================
  // HEADER
  // ===================================================

  header: {
    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 16,

    backgroundColor: '#FFFFFF',

    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },

  headerButton: {
    width: 42,
    height: 42,

    borderRadius: 21,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: '#F8FAFC',
  },

  headerContent: {
    flex: 1,
    paddingHorizontal: 12,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },

  headerSubtitle: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },

  // ===================================================
  // MAIN
  // ===================================================

  mainContent: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
  },

  // ===================================================
  // ROOM INFO
  // ===================================================

  roomInfo: {
    flexDirection: 'row',
    alignItems: 'center',

    backgroundColor: '#FFFFFF',

    paddingHorizontal: 12,
    paddingVertical: 10,

    borderRadius: 16,

    borderWidth: 1,
    borderColor: '#E2E8F0',

    marginBottom: 10,
  },

  roomIcon: {
    width: 40,
    height: 40,

    borderRadius: 12,

    backgroundColor: '#ECFDF5',

    alignItems: 'center',
    justifyContent: 'center',
  },

  roomInfoContent: {
    flex: 1,
    marginLeft: 10,
  },

  roomName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },

  roomDescription: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748B',
  },

  floorBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,

    borderRadius: 20,

    backgroundColor: '#F0FDFA',
  },

  floorBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F766E',
  },

  // ===================================================
  // CANVAS HEADER
  // ===================================================

  canvasHeader: {
    flexDirection: 'row',

    alignItems: 'center',
    justifyContent:
      'space-between',

    marginBottom: 8,
  },

  canvasTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },

  canvasSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: '#64748B',
  },

  itemCount: {
    flexDirection: 'row',
    alignItems: 'center',

    gap: 5,

    paddingHorizontal: 9,
    paddingVertical: 5,

    borderRadius: 20,

    backgroundColor: '#ECFDF5',
  },

  itemCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F766E',
  },

  // ===================================================
  // CANVAS
  // ===================================================

  canvasArea: {
    flex: 1,

    alignItems: 'center',
    justifyContent: 'center',

    minHeight: 200,
  },

  canvas: {
    width: '100%',

    maxWidth: 500,

    position: 'relative',

    overflow: 'hidden',

    borderRadius: 6,

    borderWidth: 4,
    borderColor: '#475569',

    backgroundColor: '#F8F5EF',
  },

  // ===================================================
  // GRID
  // ===================================================

  gridContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3,
  },

  verticalGrid: {
    position: 'absolute',

    top: 0,
    bottom: 0,

    width: 1,

    backgroundColor:
      'rgba(255,255,255,0.30)',
  },

  horizontalGrid: {
    position: 'absolute',

    left: 0,
    right: 0,

    height: 1,

    backgroundColor:
      'rgba(255,255,255,0.30)',
  },

  // ===================================================
  // LABELS
  // ===================================================

  roomLabel: {
    position: 'absolute',

    left: 10,
    top: 10,

    zIndex: 20,

    flexDirection: 'row',
    alignItems: 'center',

    gap: 5,

    paddingHorizontal: 8,
    paddingVertical: 5,

    borderRadius: 8,

    backgroundColor:
      'rgba(255,255,255,0.88)',
  },

  roomLabelText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },

  scaleLabel: {
    position: 'absolute',

    right: 10,
    top: 10,

    zIndex: 20,

    paddingHorizontal: 8,
    paddingVertical: 5,

    borderRadius: 8,

    backgroundColor:
      'rgba(15,23,42,0.72)',
  },

  scaleLabelText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ===================================================
  // EMPTY
  // ===================================================

  emptyCanvas: {
    ...StyleSheet.absoluteFillObject,

    zIndex: 10,

    alignItems: 'center',
    justifyContent: 'center',

    paddingHorizontal: 30,
  },

  emptyIcon: {
    width: 76,
    height: 76,

    borderRadius: 38,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor:
      'rgba(255,255,255,0.82)',

    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#334155',
  },

  emptyText: {
    marginTop: 5,

    fontSize: 11,

    color: '#64748B',

    textAlign: 'center',
  },

  // ===================================================
  // FURNITURE
  // ===================================================

  furnitureItem: {
    position: 'absolute',

    left: 0,
    top: 0,

    zIndex: 30,

    alignItems: 'center',
    justifyContent: 'center',
  },

  furnitureItemSelected: {
    borderWidth: 2,
    borderColor: '#0F766E',

    borderRadius: 8,

    backgroundColor:
      'rgba(15,118,110,0.08)',
  },

  furnitureImage: {
    width: '100%',
    height: '100%',
  },

  selectedDot: {
    position: 'absolute',

    right: -7,
    top: -7,

    width: 20,
    height: 20,

    borderRadius: 10,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: '#0F766E',

    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  // ===================================================
  // ITEM ACTIONS
  // ===================================================

  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',

    backgroundColor: '#FFFFFF',

    borderWidth: 1,
    borderColor: '#E2E8F0',

    borderRadius: 12,

    marginTop: 8,
    marginBottom: 4,

    paddingHorizontal: 10,
    paddingVertical: 7,

    gap: 8,
  },

  selectedItemLabel: {
    flex: 1,

    flexDirection: 'row',
    alignItems: 'center',

    gap: 6,
  },

  selectedItemText: {
    fontSize: 11,
    fontWeight: '700',

    color: '#0F766E',
  },

  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',

    gap: 5,

    paddingHorizontal: 10,
    paddingVertical: 6,

    borderRadius: 8,

    backgroundColor: '#F8FAFC',
  },

  actionText: {
    fontSize: 10,
    fontWeight: '700',

    color: '#475569',
  },

  deleteButton: {
    width: 34,
    height: 34,

    borderRadius: 8,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: '#FEF2F2',
  },

  // ===================================================
  // TOOL PANEL
  // ===================================================

  toolPanel: {
    backgroundColor: '#FFFFFF',

    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',

    paddingTop: 8,
    paddingBottom: 8,
  },

  toolTabs: {
    flexDirection: 'row',

    paddingHorizontal: 10,

    marginBottom: 8,

    gap: 5,
  },

  toolTab: {
    flex: 1,

    alignItems: 'center',
    justifyContent: 'center',

    paddingVertical: 7,

    borderRadius: 10,

    backgroundColor: '#F8FAFC',
  },

  toolTabActive: {
    backgroundColor: '#ECFDF5',
  },

  toolTabText: {
    marginTop: 2,

    fontSize: 9,
    fontWeight: '700',

    color: '#94A3B8',
  },

  toolTabTextActive: {
    color: '#0F766E',
  },

  // ===================================================
  // ASSET LIST
  // ===================================================

  furnitureList: {
    paddingHorizontal: 10,

    gap: 10,
  },

  furnitureChoice: {
    width: 82,

    position: 'relative',

    alignItems: 'center',

    paddingVertical: 6,

    borderRadius: 12,

    backgroundColor: '#F8FAFC',

    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  choiceImageContainer: {
    width: 58,
    height: 46,

    alignItems: 'center',
    justifyContent: 'center',
  },

  choiceImage: {
    width: '100%',
    height: '100%',
  },

  choiceName: {
    marginTop: 3,

    fontSize: 10,
    fontWeight: '700',

    color: '#334155',
  },

  choicePrice: {marginTop: 3, fontSize: 10, fontWeight: '700', color: '#0F766E', textAlign: 'center'},

  choiceSize: {
    marginTop: 1,

    fontSize: 8,

    color: '#94A3B8',
  },

  plusBadge: {
    position: 'absolute',

    right: 4,
    top: 4,

    width: 18,
    height: 18,

    borderRadius: 9,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: '#0F766E',
  },

  // ===================================================
  // FLOOR LIST
  // ===================================================

  floorList: {
    paddingHorizontal: 10,

    gap: 10,
  },

  floorChoice: {
    width: 68,

    alignItems: 'center',

    paddingVertical: 6,
    paddingHorizontal: 4,

    borderRadius: 12,

    borderWidth: 1.5,
    borderColor: 'transparent',
  },

  floorChoiceActive: {
    borderColor: '#0F766E',

    backgroundColor: '#F0FDFA',
  },

  floorPreview: {
    width: 52,
    height: 45,

    position: 'relative',

    overflow: 'hidden',

    borderRadius: 8,

    borderWidth: 1,
    borderColor: '#CBD5E1',
  },

  floorSelectedIcon: {
    position: 'absolute',

    right: 3,
    top: 3,

    width: 20,
    height: 20,

    borderRadius: 10,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: '#0F766E',
  },

  floorName: {
    marginTop: 4,

    fontSize: 9,
    fontWeight: '600',

    color: '#64748B',
  },

  floorNameActive: {
    color: '#0F766E',

    fontWeight: '800',
  },

  // ===================================================
  // FLOOR PREVIEW PATTERNS
  // ===================================================

  previewWoodLine: {
    position: 'absolute',

    left: 0,
    right: 0,

    height: 1,
  },

  previewWoodJoint: {
    position: 'absolute',

    width: 1,
  },

  previewWoodGrain: {
    position: 'absolute',

    width: 15,
    height: 1,

    opacity: 0.5,

    borderRadius: 10,
  },

  previewVertical: {
    position: 'absolute',

    top: 0,
    bottom: 0,

    left: '50%',

    width: 1,
  },

  previewHorizontal: {
    position: 'absolute',

    left: 0,
    right: 0,

    top: '50%',

    height: 1,
  },

  previewMarbleLine: {
    position: 'absolute',

    width: 70,
    height: 2,

    top: 13,
    left: -10,

    opacity: 0.6,

    transform: [
      {
        rotate: '-20deg',
      },
    ],
  },

  previewMarbleLineTwo: {
    position: 'absolute',

    width: 65,
    height: 1,

    top: 30,
    left: 2,

    opacity: 0.45,

    transform: [
      {
        rotate: '20deg',
      },
    ],
  },

  previewConcreteOne: {
    position: 'absolute',

    width: 20,
    height: 12,

    left: 6,
    top: 7,

    borderRadius: 12,

    backgroundColor:
      'rgba(100,116,139,0.18)',
  },

  previewConcreteTwo: {
    position: 'absolute',

    width: 24,
    height: 14,

    right: 4,
    bottom: 5,

    borderRadius: 14,

    backgroundColor:
      'rgba(100,116,139,0.15)',
  },

  marbleLine: {
    position: 'absolute',

    height: 2,

    opacity: 0.45,

    borderRadius: 10,
  },

  marbleThinLine: {
    position: 'absolute',

    height: 1,

    opacity: 0.35,

    borderRadius: 10,
  },

  concretePatch: {
    position: 'absolute',

    width: 75,
    height: 45,

    borderRadius: 50,

    backgroundColor:
      'rgba(100,116,139,0.13)',
  },

  // ===================================================
  // WALL
  // ===================================================

  wallList: {
    paddingHorizontal: 10,

    gap: 10,
  },

  wallChoice: {
    width: 68,

    alignItems: 'center',

    paddingVertical: 6,
    paddingHorizontal: 4,

    borderRadius: 12,

    borderWidth: 1.5,
    borderColor: 'transparent',
  },

  wallChoiceActive: {
    borderColor: '#0F766E',

    backgroundColor: '#F0FDFA',
  },

  wallColorCircle: {
    width: 42,
    height: 42,

    borderRadius: 21,

    borderWidth: 2,
    borderColor: '#CBD5E1',

    alignItems: 'center',
    justifyContent: 'center',

    position: 'relative',
  },

  wallSelectedIcon: {
    width: 22,
    height: 22,

    borderRadius: 11,

    backgroundColor: '#0F766E',

    alignItems: 'center',
    justifyContent: 'center',
  },

  wallName: {
    marginTop: 4,

    fontSize: 9,
    fontWeight: '600',

    color: '#64748B',
  },

  wallNameActive: {
    color: '#0F766E',

    fontWeight: '800',
  },

  // ===================================================
  // BOTTOM BAR
  // ===================================================

  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',

    gap: 10,

    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,

    backgroundColor: '#FFFFFF',

    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },

  resetButton: {
    height: 46,

    paddingHorizontal: 18,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    gap: 6,

    borderRadius: 12,

    backgroundColor: '#F1F5F9',
  },

  resetText: {
    fontSize: 13,
    fontWeight: '700',

    color: '#64748B',
  },

  saveButton: {
    flex: 1,

    height: 46,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    gap: 7,

    borderRadius: 12,

    backgroundColor: '#0F766E',
  },

  saveText: {
    fontSize: 14,
    fontWeight: '800',

    color: '#FFFFFF',
  },
});

export default RoomCustomizerScreen;
export {DraggableFurniture};
