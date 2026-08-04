import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Mask,
  Rect,
  Stop,
} from 'react-native-svg';
import { fonts } from '../helpers/styles';

type ScratchPoint = {
  x: number;
  y: number;
};

type ScratchToRevealProps = {
  children: React.ReactNode;
  width: number;
  height: number;
  brushRadius?: number;
  revealThreshold?: number;
  hint?: string;
  style?: ViewStyle;
  onRevealed?: () => void;
};

const SAMPLE_STEP = 10;

const ScratchToReveal: React.FC<ScratchToRevealProps> = ({
  children,
  width,
  height,
  brushRadius = 22,
  revealThreshold = 0.52,
  hint = 'Scratch to reveal',
  style,
  onRevealed,
}) => {
  const [points, setPoints] = useState<ScratchPoint[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [layoutReady, setLayoutReady] = useState(false);
  const revealedRef = useRef(false);
  const pointsRef = useRef<ScratchPoint[]>([]);
  const coveredCellsRef = useRef<Set<string>>(new Set());

  const gridCols = Math.max(1, Math.ceil(width / SAMPLE_STEP));
  const gridRows = Math.max(1, Math.ceil(height / SAMPLE_STEP));
  const totalCells = gridCols * gridRows;

  const markCoverage = useCallback(
    (x: number, y: number) => {
      const radius = brushRadius;
      const minCol = Math.max(0, Math.floor((x - radius) / SAMPLE_STEP));
      const maxCol = Math.min(gridCols - 1, Math.floor((x + radius) / SAMPLE_STEP));
      const minRow = Math.max(0, Math.floor((y - radius) / SAMPLE_STEP));
      const maxRow = Math.min(gridRows - 1, Math.floor((y + radius) / SAMPLE_STEP));
      const radiusSq = radius * radius;

      for (let row = minRow; row <= maxRow; row += 1) {
        for (let col = minCol; col <= maxCol; col += 1) {
          const cx = col * SAMPLE_STEP + SAMPLE_STEP / 2;
          const cy = row * SAMPLE_STEP + SAMPLE_STEP / 2;
          const dx = cx - x;
          const dy = cy - y;
          if (dx * dx + dy * dy <= radiusSq) {
            coveredCellsRef.current.add(`${col}:${row}`);
          }
        }
      }

      if (
        !revealedRef.current &&
        coveredCellsRef.current.size / totalCells >= revealThreshold
      ) {
        revealedRef.current = true;
        setRevealed(true);
        onRevealed?.();
      }
    },
    [brushRadius, gridCols, gridRows, onRevealed, revealThreshold, totalCells],
  );

  const addPoint = useCallback(
    (x: number, y: number) => {
      if (revealedRef.current) {
        return;
      }

      const clampedX = Math.max(0, Math.min(width, x));
      const clampedY = Math.max(0, Math.min(height, y));
      const last = pointsRef.current[pointsRef.current.length - 1];
      if (last) {
        const dx = clampedX - last.x;
        const dy = clampedY - last.y;
        if (dx * dx + dy * dy < 36) {
          return;
        }
      }

      const next = { x: clampedX, y: clampedY };
      pointsRef.current = [...pointsRef.current, next];
      setPoints(pointsRef.current);
      markCoverage(clampedX, clampedY);
    },
    [height, markCoverage, width],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !revealedRef.current,
        onMoveShouldSetPanResponder: () => !revealedRef.current,
        onPanResponderGrant: event => {
          const { locationX, locationY } = event.nativeEvent;
          addPoint(locationX, locationY);
        },
        onPanResponderMove: event => {
          const { locationX, locationY } = event.nativeEvent;
          addPoint(locationX, locationY);
        },
      }),
    [addPoint],
  );

  const onLayout = (_event: LayoutChangeEvent) => {
    setLayoutReady(true);
  };

  return (
    <View style={[styles.root, { width, height }, style]} onLayout={onLayout}>
      <View style={styles.content}>{children}</View>

      {!revealed && layoutReady ? (
        <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers}>
          <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
            <Defs>
              <SvgLinearGradient id="foilGradient" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#F8FAFC" stopOpacity="1" />
                <Stop offset="0.45" stopColor="#CBD5E1" stopOpacity="1" />
                <Stop offset="1" stopColor="#94A3B8" stopOpacity="1" />
              </SvgLinearGradient>
              <Mask id="scratchMask">
                <Rect x={0} y={0} width={width} height={height} fill="#FFFFFF" />
                {points.map((point, index) => (
                  <Circle
                    key={`${point.x}-${point.y}-${index}`}
                    cx={point.x}
                    cy={point.y}
                    r={brushRadius}
                    fill="#000000"
                  />
                ))}
              </Mask>
            </Defs>
            <Rect
              x={0}
              y={0}
              width={width}
              height={height}
              fill="url(#foilGradient)"
              mask="url(#scratchMask)"
            />
          </Svg>

          {points.length === 0 ? (
            <View pointerEvents="none" style={styles.hintWrap}>
              <Text style={styles.hintText}>{hint}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

export default ScratchToReveal;

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintText: {
    fontSize: 14,
    color: '#334155',
    fontFamily: fonts.BOLD,
    backgroundColor: 'rgba(255,255,255,0.72)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
});
