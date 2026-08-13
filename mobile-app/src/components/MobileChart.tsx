import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type DataPoint = { label: string; value: number; color?: string };

export default function MobileChart({
  type = 'bar',
  data = [],
  height = 160,
}: {
  type?: 'bar' | 'pie';
  data: DataPoint[];
  height?: number;
}) {
  if (!data || data.length === 0) {
    return null;
  }

  if (type === 'pie') {
    const total = data.reduce((s, d) => s + d.value, 0) || 1;
    return (
      <View style={[styles.pieWrap, { height }]}> 
        {data.map((d, i) => (
          <View key={i} style={styles.pieRow}>
            <View style={[styles.legendDot, { backgroundColor: d.color || defaultColor(i) }]} />
            <Text style={styles.legendLabel}>{d.label}</Text>
            <Text style={styles.legendValue}>{Math.round((d.value / total) * 100)}%</Text>
          </View>
        ))}
      </View>
    );
  }

  // default: horizontal bar chart
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <View style={[styles.wrap, { height }]}> 
      {data.map((d, i) => (
        <View key={i} style={styles.row}>
          <Text style={styles.label}>{d.label}</Text>
          <View style={styles.barOuter}>
            <View
              style={[
                styles.barInner,
                { width: `${(d.value / max) * 100}%`, backgroundColor: d.color || defaultColor(i) },
              ]}
            />
          </View>
          <Text style={styles.value}>{d.value}</Text>
        </View>
      ))}
    </View>
  );
}

function defaultColor(i: number) {
  const palette = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6'];
  return palette[i % palette.length];
}

const styles = StyleSheet.create({
  wrap: { padding: 8, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { width: 110, color: '#374151', fontSize: 12 },
  barOuter: { flex: 1, height: 14, backgroundColor: '#e6e9ef', borderRadius: 8, overflow: 'hidden' },
  barInner: { height: '100%', borderRadius: 8 },
  value: { width: 48, textAlign: 'right', color: '#374151', fontSize: 12 },
  pieWrap: { padding: 8, justifyContent: 'center' },
  pieRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  legendLabel: { flex: 1, color: '#374151', fontSize: 13 },
  legendValue: { width: 48, textAlign: 'right', color: '#374151' },
});
