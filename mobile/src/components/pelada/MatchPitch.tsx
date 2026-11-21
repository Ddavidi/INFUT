// Campo com os dois times em quadra (estilo escalacao de jogo profissional):
// foto + nome de cada jogador na sua posicao, bolinha para quem fez gol e chuteira
// para quem deu assistencia na partida atual.
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Avatar } from '../ui/Avatar';
import { DrawnTeam, DrawnTeamPlayer, LiveGoalEvent } from '../../types';

const GRASS = '#3F9B4F';
const GRASS_DARK = '#388C47';
const LINE = 'rgba(255,255,255,0.55)';

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** 0 defesa, 1 meio, 2 ataque, 3 sem posicao definida (mesma regra do sorteio no backend) */
function positionBucket(position: string | null): number {
  if (!position) return 3;
  const pos = normalize(position);
  if (['zagueir', 'lateral', 'fixo', 'libero', 'defens'].some((k) => pos.includes(k))) return 0;
  if (['meia-atac', 'ponta', 'atac', 'pivo', 'oposto', 'central'].some((k) => pos.includes(k))) return 2;
  if (['meia', 'meio', 'volante', 'armador', 'levantador', 'ala'].some((k) => pos.includes(k))) return 1;
  return 3;
}

function evenSplit(players: DrawnTeamPlayer[], rows: number): DrawnTeamPlayer[][] {
  const result: DrawnTeamPlayer[][] = [];
  let start = 0;
  for (let r = 0; r < rows; r++) {
    const size = Math.ceil((players.length - start) / (rows - r));
    result.push(players.slice(start, start + size));
    start += size;
  }
  return result.filter((row) => row.length > 0);
}

/** Linhas a partir do proprio gol: defesa -> meio -> ataque. */
export function buildFormationRows(fieldPlayers: DrawnTeamPlayer[]): DrawnTeamPlayer[][] {
  const buckets: DrawnTeamPlayer[][] = [[], [], [], []];
  fieldPlayers.forEach((p) => buckets[positionBucket(p.position)].push(p));
  const [def, mid, att, unknown] = buckets;

  if (unknown.length === fieldPlayers.length) {
    const n = fieldPlayers.length;
    const rows = n <= 3 ? 1 : n <= 6 ? 2 : 3;
    return evenSplit(fieldPlayers, rows);
  }

  const rows = [def, mid, att];
  // Sem posicao: entram na linha mais vazia (desempate: meio, defesa, ataque)
  for (const p of unknown) {
    const order = [1, 0, 2];
    const target = order.reduce((best, idx) => (rows[idx].length < rows[best].length ? idx : best), order[0]);
    rows[target].push(p);
  }
  // Nenhuma linha com mais de 5: excedente vai para a linha seguinte
  const MAX = 5;
  for (let i = 0; i < rows.length; i++) {
    while (rows[i].length > MAX) {
      const next = i + 1 < rows.length ? i + 1 : i - 1;
      rows[next].push(rows[i].pop()!);
    }
  }
  return rows.filter((r) => r.length > 0);
}

interface PlayerStats {
  goals: number;
  assists: number;
}

interface MatchPitchProps {
  teamA: DrawnTeam;
  teamB: DrawnTeam;
  events: LiveGoalEvent[];
  photoByPlayerId: Record<string, string | null | undefined>;
  teamPhotos?: Record<string, string>;
}

export function MatchPitch({ teamA, teamB, events, photoByPlayerId, teamPhotos }: MatchPitchProps) {
  const [width, setWidth] = useState(0);

  const statsById = useMemo(() => {
    const map: Record<string, PlayerStats> = {};
    for (const e of events) {
      if (e.scorerId && !e.ownGoal) {
        map[e.scorerId] = map[e.scorerId] || { goals: 0, assists: 0 };
        map[e.scorerId].goals += 1;
      }
      if (e.assistId) {
        map[e.assistId] = map[e.assistId] || { goals: 0, assists: 0 };
        map[e.assistId].assists += 1;
      }
    }
    return map;
  }, [events]);

  const height = width > 0 ? Math.round(width * 1.45) : 0;
  const avatarSize = width > 0 ? Math.max(30, Math.min(46, Math.round(width / 10))) : 40;

  function renderPlayer(p: DrawnTeamPlayer) {
    const stats = statsById[p.id];
    return (
      <View key={p.id} style={[styles.playerSlot, { width: Math.max(64, avatarSize + 30) }]}>
        <View>
          <Avatar
            name={p.name}
            photoUrl={photoByPlayerId[p.id]}
            size={avatarSize}
            rounded
            borderColor={p.isGoalkeeper ? '#FACC15' : 'rgba(255,255,255,0.9)'}
          />
          {stats?.goals ? (
            <View style={[styles.badge, styles.goalBadge]} accessibilityLabel={`${stats.goals} gol(s)`}>
              <Ionicons name="football" size={13} color="#111" />
              {stats.goals > 1 ? <Text style={styles.badgeCount}>{stats.goals}</Text> : null}
            </View>
          ) : null}
          {stats?.assists ? (
            <View
              style={[styles.badge, styles.assistBadge]}
              accessibilityLabel={`${stats.assists} assistência(s)`}
            >
              <MaterialCommunityIcons name="shoe-cleat" size={13} color="#111" />
              {stats.assists > 1 ? <Text style={styles.badgeCount}>{stats.assists}</Text> : null}
            </View>
          ) : null}
        </View>
        <Text style={styles.playerName} numberOfLines={1}>
          {p.isGoalkeeper ? '🧤 ' : ''}
          {shortName(p.name)}
        </Text>
      </View>
    );
  }

  function renderHalf(team: DrawnTeam, side: 'top' | 'bottom') {
    const gks = team.players.filter((p) => p.isGoalkeeper);
    const field = team.players.filter((p) => !p.isGoalkeeper);
    const rows = [gks, ...buildFormationRows(field)].filter((r) => r.length > 0);
    const ordered = side === 'top' ? rows : [...rows].reverse();
    return (
      <View style={styles.half}>
        {ordered.map((row, idx) => (
          <View key={`${side}-${idx}`} style={styles.row}>
            {row.map(renderPlayer)}
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <TeamHeader team={teamA} photo={teamPhotos?.[teamA.name]} />
      <View
        style={[styles.pitch, height ? { height } : { aspectRatio: 1 / 1.45 }]}
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      >
        {/* gramado listrado */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {Array.from({ length: 10 }).map((_, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: i % 2 === 0 ? GRASS : GRASS_DARK }} />
          ))}
        </View>
        {/* marcacoes */}
        <View style={[StyleSheet.absoluteFill, styles.lines]} pointerEvents="none">
          <View style={styles.halfLine} />
          <View style={[styles.centerCircle, width ? { width: width * 0.26, height: width * 0.26, borderRadius: width * 0.13, marginLeft: -width * 0.13, marginTop: -width * 0.13 } : null]} />
          <View style={[styles.box, styles.boxTop]} />
          <View style={[styles.box, styles.boxBottom]} />
        </View>

        {width > 0 ? (
          <View style={styles.teamsLayer}>
            {renderHalf(teamA, 'top')}
            {renderHalf(teamB, 'bottom')}
          </View>
        ) : null}
      </View>
      <TeamHeader team={teamB} photo={teamPhotos?.[teamB.name]} />
    </View>
  );
}

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return name;
  const last = parts[parts.length - 1];
  return `${parts[0]} ${last.length > 1 ? `${last[0]}.` : last}`;
}

function TeamHeader({ team, photo }: { team: DrawnTeam; photo?: string }) {
  return (
    <View style={styles.teamHeader}>
      <Avatar name={team.name.replace(/^time\s+/i, '')} photoUrl={photo} size={24} rounded />
      <Text style={styles.teamHeaderText} numberOfLines={1}>
        {team.name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: GRASS_DARK,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#2F7A3D',
  },
  teamHeaderText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    flex: 1,
  },
  pitch: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  lines: {
    borderWidth: 2,
    borderColor: LINE,
    margin: 8,
  },
  halfLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 2,
    backgroundColor: LINE,
  },
  centerCircle: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    borderWidth: 2,
    borderColor: LINE,
  },
  box: {
    position: 'absolute',
    left: '24%',
    right: '24%',
    height: '13%',
    borderWidth: 2,
    borderColor: LINE,
  },
  boxTop: { top: -2 },
  boxBottom: { bottom: -2 },
  teamsLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 10,
  },
  half: {
    flex: 1,
    justifyContent: 'space-around',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-start',
  },
  playerSlot: {
    alignItems: 'center',
  },
  playerName: {
    marginTop: 3,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    maxWidth: '100%',
  },
  badge: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 2,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
  },
  goalBadge: {
    right: -8,
    bottom: -4,
  },
  assistBadge: {
    left: -8,
    bottom: -4,
  },
  badgeCount: {
    fontSize: 10,
    fontWeight: '800',
    color: '#111',
    marginLeft: 1,
  },
});
