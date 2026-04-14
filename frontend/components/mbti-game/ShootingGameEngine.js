// app/components/mbti-game/ShootingGameEngine.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { GestureHandlerRootView, Gesture } from 'react-native-gesture-handler';
import VirtualJoystick from '../../components/mbti-game/VirtualJoystick';
import ScenarioDialog from '../../components/mbti-game/scenario-dialog';
import CustomAlertModal from './CustomAlertModal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PLAYER_SIZE = 40;
const BULLET_SIZE = 8;
const MONSTER_SIZE = 40;
const EXIT_SIZE = 50;
const PLAYER_SPEED = 3.8;
const BULLET_SPEED = 6.8;
const MONSTER_SPEED = 1.15;

const MAP_WIDTH = 900;
const MAP_HEIGHT = 550;

const WEAPONS = {
  pistol: { damage: 8, attackSpeed: 200, bulletCount: 1, range: 300, spread: 0 },
  rifle: { damage: 15, attackSpeed: 300, bulletCount: 1, range: 500, spread: 0 },
  sniper: { damage: 40, attackSpeed: 800, bulletCount: 1, range: 800, spread: 0 },
  shotgun: { damage: 10, attackSpeed: 500, bulletCount: 5, range: 200, spread: 0.2 },
  smg: { damage: 10, attackSpeed: 100, bulletCount: 1, range: 350, spread: 0 },
};

const EXP_PER_LEVEL = 60;
const MAX_UPGRADES = 10;

export default function ShootingGameEngine({
  level: levelProp,
  character,
  onGameComplete: onGameCompleteProp,
  onBack,
  mbtiScores: mbtiScoresProp,
  setMbtiScores,
  gameMode = 'normal',
  pickQuestion,
  returnQuestions,
}) {
  if (!levelProp) return null;

  const weaponId = character?.weapon || 'pistol';
  const weapon = WEAPONS[weaponId];

  // ref 儲存外部依賴
  const levelRef = useRef(levelProp);
  const onGameCompleteRef = useRef(onGameCompleteProp);
  const mbtiScoresRef = useRef(mbtiScoresProp);
  const pickQuestionRef = useRef(pickQuestion);
  const returnQuestionsRef = useRef(returnQuestions);

  useEffect(() => { levelRef.current = levelProp; }, [levelProp]);
  useEffect(() => { onGameCompleteRef.current = onGameCompleteProp; }, [onGameCompleteProp]);
  useEffect(() => { mbtiScoresRef.current = mbtiScoresProp; }, [mbtiScoresProp]);
  useEffect(() => { pickQuestionRef.current = pickQuestion; }, [pickQuestion]);
  useEffect(() => { returnQuestionsRef.current = returnQuestions; }, [returnQuestions]);

  // ====================== Custom Alert Modal ======================
  const [alertModal, setAlertModal] = useState({
    visible: false,
    title: '',
    message: '',
    buttons: [],
  });

  const showAlert = useCallback((title, message, buttons = []) => {
    setAlertModal({
      visible: true,
      title,
      message,
      buttons: buttons.length > 0 
        ? buttons 
        : [{ text: '確定', onPress: hideAlert }],
    });
  }, []);

  const hideAlert = useCallback(() => {
    setAlertModal(prev => ({ ...prev, visible: false }));
  }, []);
  // ==============================================================

  // 玩家狀態
  const [player, setPlayer] = useState({
    x: 100,
    y: MAP_HEIGHT - 150,
    hp: 100,
    maxHp: 100,
    attack: weapon.damage,
    attackSpeed: weapon.attackSpeed,
    moveSpeed: PLAYER_SPEED,
    lifesteal: 0,
    exp: 0,
    level: 1,
    weapon: weaponId,
  });

  const [bullets, setBullets] = useState([]);
  const [monsters, setMonsters] = useState([]);
  const [obstacles, setObstacles] = useState([]);
  const [items, setItems] = useState([]);
  const [exit, setExit] = useState(null);
  const [currentFloorIndex, setCurrentFloorIndex] = useState(0);
  const [gamePaused, setGamePaused] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [joystickDir, setJoystickDir] = useState({ x: 0, y: 0 });
  const [shootDir, setShootDir] = useState({ x: 0, y: 0 });
  const [isGameOver, setIsGameOver] = useState(false);
  const [isFloorCleared, setIsFloorCleared] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [showPauseMenu, setShowPauseMenu] = useState(false);
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });
  const [isLoadingFloor, setIsLoadingFloor] = useState(false);

  const isTransitioning = useRef(false);
  const upgradeCountRef = useRef(0);
  const usedQuestionsInLevel = useRef([]);
  const isLevelCompletedRef = useRef(false);

  // Refs
  const playerRef = useRef(player);
  const bulletsRef = useRef(bullets);
  const monstersRef = useRef(monsters);
  const obstaclesRef = useRef(obstacles);
  const itemsRef = useRef(items);
  const exitRef = useRef(exit);
  const gamePausedRef = useRef(gamePaused);
  const isGameOverRef = useRef(isGameOver);
  const gameStartedRef = useRef(gameStarted);
  const joystickDirRef = useRef(joystickDir);
  const shootDirRef = useRef(shootDir);
  const isLoadingFloorRef = useRef(isLoadingFloor);

  useEffect(() => { playerRef.current = player; }, [player]);
  useEffect(() => { bulletsRef.current = bullets; }, [bullets]);
  useEffect(() => { monstersRef.current = monsters; }, [monsters]);
  useEffect(() => { obstaclesRef.current = obstacles; }, [obstacles]);
  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { exitRef.current = exit; }, [exit]);
  useEffect(() => { gamePausedRef.current = gamePaused; }, [gamePaused]);
  useEffect(() => { isGameOverRef.current = isGameOver; }, [isGameOver]);
  useEffect(() => { gameStartedRef.current = gameStarted; }, [gameStarted]);
  useEffect(() => { joystickDirRef.current = joystickDir; }, [joystickDir]);
  useEffect(() => { shootDirRef.current = shootDir; }, [shootDir]);
  useEffect(() => { isLoadingFloorRef.current = isLoadingFloor; }, [isLoadingFloor]);

  // 手勢
  const moveGesture = useRef(Gesture.Pan());
  const shootGesture = useRef(Gesture.Pan());

  useEffect(() => {
    moveGesture.current = moveGesture.current.simultaneousWithExternalGesture(shootGesture.current);
    shootGesture.current = shootGesture.current.simultaneousWithExternalGesture(moveGesture.current);
  }, []);

  // 載入樓層
  useEffect(() => {
    if (!levelRef.current?.floors?.length) return;
    const floor = levelRef.current.floors[currentFloorIndex];
    if (!floor) return;

    isTransitioning.current = true;
    setIsLoadingFloor(true);

    const normalizedMonsters = (floor.monsters || []).map((m, idx) => ({
      instanceId: m.instanceId || `monster_${Date.now()}_${idx}_${Math.random()}`,
      x: m.x ?? 100 + Math.random() * 200,
      y: m.y ?? 100 + Math.random() * 200,
      hp: m.hp ?? 30,
      attack: m.attack ?? 5,
      expReward: m.expReward ?? 10,
      speed: m.speed ?? 2,
      color: m.color ?? '#e74c3c',
      image: m.image ?? null,
      ...m,
    }));

    setObstacles(floor.obstacles || []);
    setItems(floor.items || []);
    setExit(floor.exit || null);
    setMonsters(normalizedMonsters);
    setIsFloorCleared(false);
    setBullets([]);

    const spawnX = floor.spawnPoint?.x ?? 100;
    const spawnY = floor.spawnPoint?.y ?? MAP_HEIGHT - 150;
    playerRef.current = { ...playerRef.current, x: spawnX, y: spawnY };
    setPlayer(prev => ({ ...prev, x: spawnX, y: spawnY }));

    setIsLoadingFloor(false);
    isTransitioning.current = false;
  }, [currentFloorIndex]);

  // 自動射擊
  useEffect(() => {
    if (gamePaused || isGameOver || !gameStarted || isLoadingFloor) return;
    const interval = setInterval(() => {
      const dir = shootDirRef.current;
      if (dir.x === 0 && dir.y === 0) return;
      const weaponConfig = WEAPONS[playerRef.current.weapon];
      const newBullets = [];
      for (let i = 0; i < weaponConfig.bulletCount; i++) {
        let bulletDir = dir;
        if (weaponConfig.spread > 0) {
          const angle = Math.atan2(dir.y, dir.x) + (Math.random() - 0.5) * weaponConfig.spread;
          bulletDir = { x: Math.cos(angle), y: Math.sin(angle) };
        }
        newBullets.push({
          id: `bullet_${Date.now()}_${Math.random()}_${i}`,
          x: playerRef.current.x + PLAYER_SIZE / 2 - BULLET_SIZE / 2,
          y: playerRef.current.y + PLAYER_SIZE / 2 - BULLET_SIZE / 2,
          dir: bulletDir,
          damage: weaponConfig.damage,
          range: weaponConfig.range,
          distanceTraveled: 0,
        });
      }
      setBullets(prev => [...prev, ...newBullets]);
    }, playerRef.current.attackSpeed);
    return () => clearInterval(interval);
  }, [gamePaused, isGameOver, gameStarted, isLoadingFloor]);

  // 相機偏移
  useEffect(() => {
    const targetX = player.x - SCREEN_WIDTH / 2;
    const targetY = player.y - SCREEN_HEIGHT / 2;
    const clampedX = Math.max(0, Math.min(targetX, MAP_WIDTH - SCREEN_WIDTH));
    const clampedY = Math.max(0, Math.min(targetY, MAP_HEIGHT - SCREEN_HEIGHT));
    setCameraOffset({ x: clampedX, y: clampedY });
  }, [player.x, player.y]);

  const getBounds = (obj, type) => {
    if (!obj) return null;
    let x, y, w, h;
    if (type === 'player') {
      x = obj.x - PLAYER_SIZE / 2; y = obj.y - PLAYER_SIZE / 2; w = PLAYER_SIZE; h = PLAYER_SIZE;
    } else if (type === 'monster') {
      x = obj.x - MONSTER_SIZE / 2; y = obj.y - MONSTER_SIZE / 2; w = MONSTER_SIZE; h = MONSTER_SIZE;
    } else if (type === 'obstacle') {
      w = obj.width || 40; h = obj.height || 40; x = obj.x - w / 2; y = obj.y - h / 2;
    } else if (type === 'item') {
      x = obj.x - 15; y = obj.y - 15; w = 30; h = 30;
    } else if (type === 'exit') {
      w = obj.width || EXIT_SIZE; h = obj.height || EXIT_SIZE; x = obj.x - w / 2; y = obj.y - h / 2;
    } else return null;
    return { x, y, w, h };
  };

  const rectCollide = (a, b) => {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  };

  const checkLevelUp = useCallback(() => {
    let leveled = false;
    while (playerRef.current.exp >= EXP_PER_LEVEL && playerRef.current.level < MAX_UPGRADES) {
      playerRef.current.exp -= EXP_PER_LEVEL;
      playerRef.current.level++;
      leveled = true;
    }
    if (leveled && upgradeCountRef.current < MAX_UPGRADES) {
      upgradeCountRef.current++;
      if (pickQuestionRef.current) {
        const question = pickQuestionRef.current();
        if (question) {
          usedQuestionsInLevel.current.push(question);
          setTimeout(() => {
            setActiveQuestion(question);
            setGamePaused(true);
          }, 0);
        }
      }
    }
  }, []);

  const returnUnusedQuestions = useCallback(() => {
    if (!isLevelCompletedRef.current && usedQuestionsInLevel.current.length > 0 && returnQuestionsRef.current) {
      returnQuestionsRef.current(usedQuestionsInLevel.current);
    }
    usedQuestionsInLevel.current = [];
  }, []);

  const finishGame = useCallback(() => {
    isLevelCompletedRef.current = true;
    setIsGameOver(true);
    onGameCompleteRef.current({
      score: playerRef.current.exp,
      playTime: 0,
      itemsCollected: [],
      choices: [],
      scores: mbtiScoresRef.current,
    });
  }, []);

  const goToNextFloor = useCallback(() => {
    if (isTransitioning.current) return;
    isTransitioning.current = true;
    setCurrentFloorIndex(prev => {
      const next = prev + 1;
      if (next < (levelRef.current?.floors?.length || 0)) return next;
      isLevelCompletedRef.current = true;
      finishGame();
      return prev;
    });
  }, [finishGame]);

  const handleGameAbort = useCallback(() => {
    returnUnusedQuestions();
    onBack();
  }, [returnUnusedQuestions, onBack]);

// ====================== 主遊戲迴圈 ======================
useEffect(() => {
  if (gamePaused || isGameOver || !gameStarted || isLoadingFloor) return;

  let lastTime = performance.now();
  let frameId;

  const gameLoop = (currentTime) => {
    const deltaTime = Math.min((currentTime - lastTime) / 16.67, 3);
    lastTime = currentTime;

    const p = playerRef.current;
    const dir = joystickDirRef.current;
    const currentMonsters = monstersRef.current;
    const currentBullets = bulletsRef.current;
    const currentObstacles = obstaclesRef.current;
    const currentItems = itemsRef.current;
    const currentExit = exitRef.current;

    // ====================== 玩家移動 ======================
    let dx = dir.x * p.moveSpeed * deltaTime;
    let dy = dir.y * p.moveSpeed * deltaTime;

    let newX = p.x + dx;
    let newY = p.y + dy;

    newX = Math.max(PLAYER_SIZE / 2, Math.min(MAP_WIDTH - PLAYER_SIZE / 2, newX));
    newY = Math.max(PLAYER_SIZE / 2, Math.min(MAP_HEIGHT - PLAYER_SIZE / 2, newY));

    const playerBoundsAfterMove = getBounds({ x: newX, y: newY }, 'player');
    let collide = false;
    for (let obs of currentObstacles) {
      const obsBounds = getBounds(obs, 'obstacle');
      if (obsBounds && rectCollide(playerBoundsAfterMove, obsBounds)) {
        collide = true;
        break;
      }
    }
    const moved = !collide;
    if (moved) {
      p.x = newX;
      p.y = newY;
    }

    // ====================== 子彈更新 ======================
    const updatedBullets = currentBullets.map(b => {
      const moveDistance = BULLET_SPEED * deltaTime;
      const newX = b.x + b.dir.x * moveDistance;
      const newY = b.y + b.dir.y * moveDistance;
      return {
        ...b,
        x: newX,
        y: newY,
        distanceTraveled: b.distanceTraveled + moveDistance,
      };
    }).filter(b => 
      b.distanceTraveled < b.range && 
      b.x > 0 && b.x < MAP_WIDTH && 
      b.y > 0 && b.y < MAP_HEIGHT
    );

    const bulletsAfterObstacles = [];
    for (let bullet of updatedBullets) {
      let hit = false;
      const bulletBounds = { 
        x: bullet.x - BULLET_SIZE / 2, 
        y: bullet.y - BULLET_SIZE / 2, 
        w: BULLET_SIZE, 
        h: BULLET_SIZE 
      };
      for (let obs of currentObstacles) {
        const obsBounds = getBounds(obs, 'obstacle');
        if (obsBounds && rectCollide(bulletBounds, obsBounds)) {
          hit = true;
          break;
        }
      }
      if (!hit) bulletsAfterObstacles.push(bullet);
    }

    // ====================== 怪物處理 ======================
    const newMonsters = currentMonsters.map(m => ({ ...m }));
    const killedMonsters = [];
    const remainingBullets = [];

    bulletsAfterObstacles.forEach(bullet => {
      let bulletUsed = false;
      const bulletBounds = { 
        x: bullet.x - BULLET_SIZE / 2, 
        y: bullet.y - BULLET_SIZE / 2, 
        w: BULLET_SIZE, 
        h: BULLET_SIZE 
      };

      for (let i = 0; i < newMonsters.length; i++) {
        const m = newMonsters[i];
        const monsterBounds = getBounds(m, 'monster');
        if (!bulletUsed && monsterBounds && rectCollide(bulletBounds, monsterBounds)) {
          m.hp -= bullet.damage;
          if (m.hp <= 0) {
            killedMonsters.push(m);
            newMonsters.splice(i, 1);
            i--;
          }
          bulletUsed = true;
        }
      }
      if (!bulletUsed) remainingBullets.push(bullet);
    });

    if (killedMonsters.length > 0) {
      const totalExp = killedMonsters.reduce((sum, m) => sum + (m.expReward || 10), 0);
      p.exp += totalExp;
      checkLevelUp();
    }

    // ====================== 怪物移動 ======================
    newMonsters.forEach(m => {
      const dx = p.x - m.x;
      const dy = p.y - m.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 1) {
        const speed = (m.speed || MONSTER_SPEED) * deltaTime;
        let moveX = (dx / dist) * speed;
        let moveY = (dy / dist) * speed;

        let newX = m.x + moveX;
        let newY = m.y + moveY;

        newX = Math.max(MONSTER_SIZE / 2, Math.min(MAP_WIDTH - MONSTER_SIZE / 2, newX));
        newY = Math.max(MONSTER_SIZE / 2, Math.min(MAP_HEIGHT - MONSTER_SIZE / 2, newY));

        let collides = false;
        const monsterBounds = getBounds({ x: newX, y: newY }, 'monster');
        for (let obs of currentObstacles) {
          const obsBounds = getBounds(obs, 'obstacle');
          if (obsBounds && rectCollide(monsterBounds, obsBounds)) {
            collides = true;
            break;
          }
        }
        if (!collides) {
          m.x = newX;
          m.y = newY;
        }
      }
    });

    // ====================== 玩家與怪物碰撞 ======================
    const currentPlayerBounds = getBounds(p, 'player');
    newMonsters.forEach(m => {
      const monsterBounds = getBounds(m, 'monster');
      if (monsterBounds && rectCollide(currentPlayerBounds, monsterBounds)) {
        p.hp -= (m.attack || 5);
      }
    });

    // ====================== 道具處理 ======================
    const newItems = currentItems.map(i => ({ ...i }));
    for (let i = newItems.length - 1; i >= 0; i--) {
      const item = newItems[i];
      const itemBounds = getBounds(item, 'item');
      if (itemBounds && rectCollide(currentPlayerBounds, itemBounds)) {
        if (item.effect?.exp) {
          p.exp += item.effect.exp;
          checkLevelUp();
        }
        newItems.splice(i, 1);
      }
    }

    // ====================== 死亡處理 ======================
    if (p.hp <= 0) {
      returnUnusedQuestions();
      setIsGameOver(true);
      showAlert('遊戲結束', '你死了...', [
        { text: '返回', onPress: onBack }
      ]);
      return;
    }

    // ====================== 樓層清除與出口 ======================
    if (newMonsters.length === 0 && newItems.length === 0 && !isFloorCleared) {
      setIsFloorCleared(true);
    }

    if (currentExit && newMonsters.length === 0 && newItems.length === 0 && !isTransitioning.current) {
      const exitBounds = getBounds(currentExit, 'exit');
      if (exitBounds && rectCollide(currentPlayerBounds, exitBounds)) {
        goToNextFloor();
      }
    }

    // ====================== 更新 React 狀態 ======================
    if (moved || p.exp !== playerRef.current.exp || p.hp !== playerRef.current.hp || p.level !== playerRef.current.level) {
      setPlayer({ ...p });
    }
    if (JSON.stringify(newMonsters) !== JSON.stringify(currentMonsters)) setMonsters(newMonsters);
    if (JSON.stringify(remainingBullets) !== JSON.stringify(currentBullets)) setBullets(remainingBullets);
    if (JSON.stringify(newItems) !== JSON.stringify(currentItems)) setItems(newItems);

    frameId = requestAnimationFrame(gameLoop);
  };

  frameId = requestAnimationFrame(gameLoop);

  return () => cancelAnimationFrame(frameId);
}, [gamePaused, isGameOver, gameStarted, isLoadingFloor, checkLevelUp, goToNextFloor, onBack, returnUnusedQuestions, showAlert]);

  const handleStartBattle = () => {
    upgradeCountRef.current = 0;
    usedQuestionsInLevel.current = [];
    isLevelCompletedRef.current = false;

    setPlayer(prev => ({
      ...prev,
      level: 1,
      exp: 0,
      hp: prev.maxHp,
    }));

    const floor = levelRef.current.floors[currentFloorIndex];
    setMonsters(floor.monsters || []);
    setGameStarted(true);
  };

  const handleScenarioChoice = (option) => {
    const mbtiDelta = option.mbti || {};
    setMbtiScores(prev => {
      const newScores = { ...prev };
      Object.keys(mbtiDelta).forEach(k => newScores[k] = (newScores[k] || 0) + mbtiDelta[k]);
      return newScores;
    });
    setActiveQuestion(null);
    setGamePaused(false);
  };

  const handleCloseQuestion = () => {
    setActiveQuestion(null);
    setGamePaused(false);
  };

  const handlePause = () => {
    setGamePaused(true);
    setShowPauseMenu(true);
  };

  const handleResume = () => {
    setGamePaused(false);
    setShowPauseMenu(false);
  };

  const handleQuit = () => {
    showAlert('離開遊戲', '確定要回到主頁嗎？', [
      { text: '取消', style: 'cancel', onPress: hideAlert },
      { 
        text: '確定', 
        style: 'destructive', 
        onPress: () => {
          hideAlert();
          handleGameAbort();
        }
      },
    ]);
  };

  const renderX = (worldX) => worldX - cameraOffset.x;
  const renderY = (worldY) => worldY - cameraOffset.y;

  const aimDots = [];
  if (gameStarted && !isGameOver && !isLoadingFloor && (shootDir.x !== 0 || shootDir.y !== 0)) {
    const magnitude = Math.hypot(shootDir.x, shootDir.y);
    const unitDir = { x: shootDir.x / magnitude, y: shootDir.y / magnitude };
    const totalLength = weapon.range;
    const dotSpacing = 20;
    const numDots = Math.floor(totalLength / dotSpacing);
    for (let i = 1; i <= numDots; i++) {
      const dotX = player.x + unitDir.x * i * dotSpacing;
      const dotY = player.y + unitDir.y * i * dotSpacing;
      aimDots.push(
        <View
          key={`aim_${i}`}
          style={[styles.aimDot, { left: renderX(dotX) - 3, top: renderY(dotY) - 3 }]}
        />
      );
    }
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={[styles.gameArea, { backgroundColor: levelProp?.bgColor || '#2c3e50' }]}>
        {levelProp?.backgroundImage && (
          <Image
            source={levelProp.backgroundImage}
            style={{
              position: 'absolute',
              width: MAP_WIDTH,
              height: MAP_HEIGHT,
              left: renderX(0),
              top: renderY(0),
            }}
            resizeMode="cover"
          />
        )}

        {/* 玩家 */}
        {character?.avatar ? (
          <Image
            source={{ uri: character.avatar }}
            style={[
              styles.playerImage,
              {
                left: renderX(player.x - PLAYER_SIZE / 2),
                top: renderY(player.y - PLAYER_SIZE / 2),
                width: PLAYER_SIZE,
                height: PLAYER_SIZE,
              },
            ]}
            resizeMode="contain"
          />
        ) : (
          <View
            style={[
              styles.player,
              {
                left: renderX(player.x - PLAYER_SIZE / 2),
                top: renderY(player.y - PLAYER_SIZE / 2),
                backgroundColor: character?.outfitColor || '#3498db',
              },
            ]}
          >
            <Text style={styles.playerHp}>{player.hp}</Text>
          </View>
        )}

        {/* 怪物 */}
        {monsters.map(m => (
          m.image ? (
            <Image
              key={m.instanceId}
              source={m.image}
              style={[
                styles.monsterImage,
                {
                  left: renderX(m.x - MONSTER_SIZE / 2),
                  top: renderY(m.y - MONSTER_SIZE / 2),
                  width: MONSTER_SIZE,
                  height: MONSTER_SIZE,
                },
              ]}
              resizeMode="contain"
            />
          ) : (
            <View
              key={m.instanceId}
              style={[
                styles.monster,
                {
                  left: renderX(m.x - MONSTER_SIZE / 2),
                  top: renderY(m.y - MONSTER_SIZE / 2),
                  backgroundColor: m.color || '#e74c3c',
                },
              ]}
            >
              <Text style={styles.monsterHp}>{m.hp}</Text>
            </View>
          )
        ))}

        {/* 障礙物 */}
        {obstacles.map(o => (
          <View
            key={o.instanceId || o.id}
            style={[
              styles.obstacle,
              {
                left: renderX(o.x - (o.width || 40) / 2),
                top: renderY(o.y - (o.height || 40) / 2),
                width: o.width || 40,
                height: o.height || 40,
                backgroundColor: o.color || '#95a5a6',
              },
            ]}
          />
        ))}

        {/* 道具 */}
        {items.map(i => (
          <View
            key={i.instanceId || i.id}
            style={[
              styles.item,
              {
                left: renderX(i.x - 15),
                top: renderY(i.y - 15),
                backgroundColor: i.color || '#f39c12',
              },
            ]}
          />
        ))}

        {/* 出口 */}
        {exit && monsters.length === 0 && items.length === 0 && (
          <View
            style={[
              styles.exit,
              {
                left: renderX(exit.x - (exit.width || EXIT_SIZE) / 2),
                top: renderY(exit.y - (exit.height || EXIT_SIZE) / 2),
                width: exit.width || EXIT_SIZE,
                height: exit.height || EXIT_SIZE,
              },
            ]}
          >
            <Text style={styles.exitText}>出口</Text>
          </View>
        )}

        {bullets.map(b => (
          <View
            key={b.id}
            style={[
              styles.bullet,
              {
                left: renderX(b.x - BULLET_SIZE / 2),
                top: renderY(b.y - BULLET_SIZE / 2),
              },
            ]}
          />
        ))}

        {aimDots}

        <View style={styles.hud}>
          <Text style={styles.hudText}>HP: {player.hp}/{player.maxHp}</Text>
          <Text style={styles.hudText}>經驗: {player.exp}/{EXP_PER_LEVEL}</Text>
          <Text style={styles.hudText}>等級: {player.level}/{MAX_UPGRADES}</Text>
          <Text style={styles.hudText}>道具: {items.length}</Text>
          <Text style={styles.hudText}>樓層: {currentFloorIndex + 1}/{levelProp?.floors?.length || 0}</Text>
          <Text style={styles.hudText}>武器: {WEAPONS[player.weapon]?.damage}傷</Text>
        </View>

        {!gameStarted && !isGameOver && (
          <TouchableOpacity style={styles.startButton} onPress={handleStartBattle}>
            <Text style={styles.startButtonText}>開始戰鬥</Text>
          </TouchableOpacity>
        )}

        {gameStarted && !isGameOver && !isLoadingFloor && (
          <>
            <TouchableOpacity style={styles.pauseButton} onPress={handlePause}>
              <Text style={styles.pauseText}>⏸</Text>
            </TouchableOpacity>
            <View style={styles.joystickContainer}>
              <VirtualJoystick gesture={moveGesture.current} onMove={setJoystickDir} />
            </View>
            <View style={styles.shootJoystickContainer}>
              <VirtualJoystick gesture={shootGesture.current} onMove={setShootDir} />
            </View>
          </>
        )}

        {isLoadingFloor && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>載入中...</Text>
          </View>
        )}

        {showPauseMenu && (
          <View style={styles.pauseMenuOverlay}>
            <View style={styles.pauseMenu}>
              <Text style={styles.pauseMenuTitle}>遊戲暫停</Text>
              <TouchableOpacity style={styles.menuButton} onPress={handleResume}>
                <Text style={styles.menuButtonText}>繼續</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.menuButton, styles.quitButton]} onPress={handleQuit}>
                <Text style={styles.menuButtonText}>回到主頁</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {activeQuestion && (
          <ScenarioDialog
            scenario={activeQuestion}
            onChoice={handleScenarioChoice}
            onClose={handleCloseQuestion}
          />
        )}

        {isGameOver && (
          <View style={styles.gameOverlay}>
            <Text style={styles.gameOverText}>遊戲結束</Text>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Text style={styles.backButtonText}>返回</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Custom Alert Modal */}
        <CustomAlertModal
          visible={alertModal.visible}
          title={alertModal.title}
          message={alertModal.message}
          buttons={alertModal.buttons}
          onClose={hideAlert}
        />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gameArea: { flex: 1, position: 'relative' },
  player: {
    position: 'absolute',
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    borderRadius: PLAYER_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  playerImage: { position: 'absolute', zIndex: 10 },
  playerHp: { color: '#fff', fontSize: 10 },
  monster: {
    position: 'absolute',
    width: MONSTER_SIZE,
    height: MONSTER_SIZE,
    borderRadius: MONSTER_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  monsterImage: { position: 'absolute', zIndex: 5 },
  monsterHp: { color: '#fff', fontSize: 10 },
  obstacle: { position: 'absolute', zIndex: 2 },
  item: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f39c12',
    zIndex: 3,
  },
  exit: {
    position: 'absolute',
    backgroundColor: 'rgba(46,204,113,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 10,
    zIndex: 4,
  },
  exitText: { color: '#fff', fontWeight: 'bold' },
  bullet: {
    position: 'absolute',
    width: BULLET_SIZE,
    height: BULLET_SIZE,
    borderRadius: BULLET_SIZE / 2,
    backgroundColor: '#fff',
    zIndex: 1,
  },
  aimDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,0,0,0.9)',
    zIndex: 100,
  },
  hud: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 20,
    zIndex: 20,
  },
  hudText: { color: '#fff', fontWeight: 'bold', marginHorizontal: 5 },
  joystickContainer: { position: 'absolute', bottom: 30, left: 30, zIndex: 100 },
  shootJoystickContainer: { position: 'absolute', bottom: 30, right: 30, zIndex: 100 },
  startButton: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT / 2 - 30,
    left: SCREEN_WIDTH / 2 - 60,
    backgroundColor: '#f4c7ab',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 30,
    zIndex: 200,
  },
  startButtonText: { color: '#5c4033', fontSize: 20, fontWeight: 'bold' },
  pauseButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
  },
  pauseText: { color: '#fff', fontSize: 24 },
  pauseMenuOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  pauseMenu: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    width: '80%',
    alignItems: 'center',
  },
  pauseMenuTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#5c4033' },
  menuButton: {
    backgroundColor: '#f4c7ab',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 10,
    width: '100%',
    alignItems: 'center',
  },
  quitButton: { backgroundColor: '#e74c3c' },
  menuButtonText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  gameOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  gameOverText: { color: '#fff', fontSize: 32, marginBottom: 20 },
  backButton: {
    backgroundColor: '#f4c7ab',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  backButtonText: { color: '#5c4033', fontWeight: 'bold', fontSize: 18 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: { color: '#fff', fontSize: 18, marginTop: 10 },
});