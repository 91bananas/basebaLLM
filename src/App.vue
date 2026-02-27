<template>
  <v-app>

    <!-- Navigation Drawer -->
    <v-navigation-drawer v-model="drawer" temporary>
      <v-list-item
        prepend-icon="mdi-baseball"
        title="BasebaLLM"
        subtitle="Defensive Scheduler"
        nav
        class="py-3"
      ></v-list-item>
      <v-divider></v-divider>
      <v-list density="compact" nav class="mt-1">
        <v-list-item
          prepend-icon="mdi-home-outline"
          title="Home"
          :active="page === 'home'"
          color="primary"
          rounded="lg"
          @click="goHome"
        ></v-list-item>
        <v-list-item
          prepend-icon="mdi-account-group-outline"
          title="Roster"
          :active="page === 'roster'"
          color="primary"
          rounded="lg"
          @click="page = 'roster'; drawer = false"
        >
          <template #append>
            <v-chip size="x-small" variant="tonal">{{ players.length }}</v-chip>
          </template>
        </v-list-item>
        <v-list-item
          prepend-icon="mdi-calendar-text-outline"
          title="Schedules"
          :active="page === 'schedules'"
          color="primary"
          rounded="lg"
          @click="page = 'schedules'; drawer = false"
        >
          <template #append>
            <v-chip v-if="savedSchedules.length" size="x-small" variant="tonal">{{ savedSchedules.length }}</v-chip>
          </template>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <!-- App Bar -->
    <v-app-bar elevation="1" color="surface">
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>
      <v-app-bar-title>
        <span class="font-weight-bold">BasebaLLM</span>
        <span class="text-medium-emphasis text-body-2 ml-2">{{ pageTitle }}</span>
      </v-app-bar-title>
    </v-app-bar>

    <!-- Main Content -->
    <v-main>
      <v-container class="py-4">

        <!-- ── HOME: Schedule Builder ── -->
        <template v-if="page === 'home'">

          <!-- Schedule Controls -->
          <v-row align="center">
            <v-col cols="6" sm="3" md="2">
              <v-text-field
                v-model.number="numInnings"
                label="Innings"
                variant="outlined"
                density="compact"
                type="number"
                min="1"
                hide-details
              ></v-text-field>
            </v-col>
            <v-col cols="6" sm="4">
              <div class="text-caption mb-1">Leniency: {{ leniencyLabel }}</div>
              <v-slider
                v-model="leniency"
                min="1" max="5" step="1"
                thumb-label
                density="compact"
                hide-details
                color="primary"
              ></v-slider>
            </v-col>
            <v-col cols="12" sm="5" class="d-flex align-center flex-wrap" style="gap:8px">
              <v-btn color="success" @click="generateSchedule">Generate Schedule</v-btn>
              <span v-if="scheduleError" class="text-error text-body-2">{{ scheduleError }}</span>
            </v-col>
          </v-row>

          <!-- Inactive / Absent Players -->
          <v-row class="mt-1" align="center">
            <v-col cols="12" sm="8" md="6">
              <v-autocomplete
                v-model="inactivePlayers"
                :items="playerNames"
                label="Absent players (will not be scheduled)"
                variant="outlined"
                density="compact"
                multiple
                chips
                closable-chips
                clearable
                hide-details
                prepend-inner-icon="mdi-account-off-outline"
              ></v-autocomplete>
            </v-col>
            <v-col cols="12" sm="4" md="6" class="text-body-2 text-medium-emphasis">
              <span v-if="inactivePlayers.length">
                {{ players.length - inactivePlayers.length }} of {{ players.length }} available
              </span>
            </v-col>
          </v-row>

          <!-- Pitcher / Catcher Manual Assignment -->
          <v-row class="mt-3">
            <v-col cols="12" md="6">
              <v-card variant="outlined">
                <v-card-title class="py-2 px-3 text-body-1 font-weight-bold">Pitcher Assignments</v-card-title>
                <v-card-text class="pa-3">
                  <div v-for="(slot, si) in pitcherSlots" :key="'p'+si" class="mb-3">
                    <div class="d-flex align-center mb-1" style="gap:8px">
                      <v-select
                        v-model="slot.player"
                        :items="activePlayerNames"
                        label="Player"
                        variant="outlined"
                        density="compact"
                        hide-details
                        clearable
                        style="max-width:200px"
                      ></v-select>
                      <v-btn v-if="pitcherSlots.length > 1" icon="mdi-close" size="x-small" variant="text" color="error" @click="pitcherSlots.splice(si,1)"></v-btn>
                    </div>
                    <div class="d-flex flex-wrap" style="gap:4px">
                      <v-chip
                        v-for="n in numInnings" :key="n"
                        :color="slot.innings.includes(n) ? 'primary' : undefined"
                        :variant="slot.innings.includes(n) ? 'flat' : 'outlined'"
                        :disabled="!slot.innings.includes(n) && pitcherInningsTaken(si).has(n)"
                        size="small"
                        @click="toggleInningSlot(slot, n)"
                      >Inn {{ n }}</v-chip>
                    </div>
                  </div>
                  <v-btn size="small" variant="tonal" color="primary" @click="pitcherSlots.push({player:'',innings:[]})">+ Add Slot</v-btn>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card variant="outlined">
                <v-card-title class="py-2 px-3 text-body-1 font-weight-bold">Catcher Assignments</v-card-title>
                <v-card-text class="pa-3">
                  <div v-for="(slot, si) in catcherSlots" :key="'c'+si" class="mb-3">
                    <div class="d-flex align-center mb-1" style="gap:8px">
                      <v-select
                        v-model="slot.player"
                        :items="activePlayerNames"
                        label="Player"
                        variant="outlined"
                        density="compact"
                        hide-details
                        clearable
                        style="max-width:200px"
                      ></v-select>
                      <v-btn v-if="catcherSlots.length > 1" icon="mdi-close" size="x-small" variant="text" color="error" @click="catcherSlots.splice(si,1)"></v-btn>
                    </div>
                    <div class="d-flex flex-wrap" style="gap:4px">
                      <v-chip
                        v-for="n in numInnings" :key="n"
                        :color="slot.innings.includes(n) ? 'secondary' : undefined"
                        :variant="slot.innings.includes(n) ? 'flat' : 'outlined'"
                        :disabled="!slot.innings.includes(n) && catcherInningsTaken(si).has(n)"
                        size="small"
                        @click="toggleInningSlot(slot, n)"
                      >Inn {{ n }}</v-chip>
                    </div>
                  </div>
                  <v-btn size="small" variant="tonal" color="secondary" @click="catcherSlots.push({player:'',innings:[]})">+ Add Slot</v-btn>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <!-- Sit fairness warnings -->
          <v-row v-if="sitFairnessWarning.length > 0" class="mt-2">
            <v-col cols="12">
              <v-alert type="warning" variant="tonal" density="compact" title="Sit rotation uneven">
                <div v-for="(w, i) in sitFairnessWarning" :key="i" class="text-body-2">{{ w }}</div>
              </v-alert>
            </v-col>
          </v-row>

          <!-- Schedule Table -->
          <v-row v-if="innings.length > 0" class="mt-2">
            <v-col cols="12">
              <v-card rounded="lg" variant="outlined">
                <v-toolbar density="compact" color="surface">
                  <v-toolbar-title class="text-body-2 font-weight-medium">
                    <v-icon size="small" class="mr-1">mdi-table</v-icon>
                    {{ activeScheduleId ? (savedSchedules.find(s => s.id === activeScheduleId) || {}).name || 'Schedule' : 'Schedule' }}
                  </v-toolbar-title>
                  <v-spacer></v-spacer>
                  <!-- Prev / Next saved schedule -->
                  <template v-if="activeScheduleIndex >= 0 && savedSchedules.length > 1">
                    <v-btn icon size="x-small" variant="text" class="mr-1" :disabled="activeScheduleIndex <= 0" @click="prevSchedule">
                      <v-icon>mdi-chevron-left</v-icon>
                    </v-btn>
                    <span class="text-caption text-medium-emphasis" style="min-width:38px;text-align:center">
                      {{ activeScheduleIndex + 1 }}&nbsp;/&nbsp;{{ savedSchedules.length }}
                    </span>
                    <v-btn icon size="x-small" variant="text" class="ml-1 mr-2" :disabled="activeScheduleIndex >= savedSchedules.length - 1" @click="nextSchedule">
                      <v-icon>mdi-chevron-right</v-icon>
                    </v-btn>
                  </template>
                  <v-btn
                    :color="manualMode ? 'warning' : 'default'"
                    :variant="manualMode ? 'flat' : 'tonal'"
                    size="small"
                    class="mr-2"
                    @click="manualMode = !manualMode"
                  >{{ manualMode ? 'Manual ON' : 'Manual' }}</v-btn>
                  <v-btn
                    variant="tonal"
                    size="small"
                    class="mr-2"
                    :disabled="undoStack.length === 0"
                    @click="undo"
                  >
                    <v-icon start size="small">mdi-undo</v-icon>
                    Undo
                  </v-btn>
                  <v-btn color="primary" variant="tonal" size="small" class="mr-2" @click="openSaveDialog">Save</v-btn>
                </v-toolbar>
                <v-divider></v-divider>
                <div style="overflow-x: auto;">
                <v-table density="compact">
                  <thead>
                    <tr>
                      <th class="text-left font-weight-bold">Pos</th>
                      <th v-for="inn in innings" :key="inn.number" class="text-center font-weight-bold">Inn {{ inn.number }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td class="font-weight-bold">P</td>
                      <td v-for="(inn, innIdx) in innings" :key="inn.number"
                          class="text-center drag-cell"
                          :class="{ 'drag-target': isDragOver(innIdx,'p',null) }"
                          @dragover.prevent="dragOverCell={innIdx,type:'p',key:null}"
                          @dragleave.self="dragOverCell=null"
                          @drop.prevent="onDrop(innIdx,'p',null)">
                        <span v-if="inn.pitcher" draggable="true" class="draggable-player"
                              @dragstart.stop="dragSrc={innIdx,type:'p',key:null}">
                          {{ displayName(inn.pitcher) }}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td class="font-weight-bold">C</td>
                      <td v-for="(inn, innIdx) in innings" :key="inn.number"
                          class="text-center drag-cell text-medium-emphasis"
                          :class="{ 'drag-target': isDragOver(innIdx,'c',null) }"
                          @dragover.prevent="dragOverCell={innIdx,type:'c',key:null}"
                          @dragleave.self="dragOverCell=null"
                          @drop.prevent="onDrop(innIdx,'c',null)">
                        <span v-if="inn.catcher" draggable="true" class="draggable-player"
                              @dragstart.stop="dragSrc={innIdx,type:'c',key:null}">
                          {{ displayName(inn.catcher) }}
                        </span>
                        <span v-else>—</span>
                      </td>
                    </tr>
                    <tr v-for="pos in autoFieldPositions" :key="pos">
                      <td class="font-weight-bold">{{ pos }}</td>
                      <td v-for="(inn, innIdx) in innings" :key="inn.number"
                          class="text-center drag-cell"
                          :class="{ 'drag-target': isDragOver(innIdx,'pos',pos) }"
                          @dragover.prevent="dragOverCell={innIdx,type:'pos',key:pos}"
                          @dragleave.self="dragOverCell=null"
                          @drop.prevent="onDrop(innIdx,'pos',pos)">
                        <span v-if="inn.assignments[pos] && inn.assignments[pos] !== 'OPEN'"
                              draggable="true" class="draggable-player"
                              @dragstart.stop="dragSrc={innIdx,type:'pos',key:pos}">
                          {{ displayName(inn.assignments[pos]) }}
                        </span>
                        <span v-else-if="inn.assignments[pos] === 'OPEN'" class="text-error font-weight-bold">OPEN</span>
                      </td>
                    </tr>
                    <tr v-for="si in sitRowCount" :key="'sit'+si" style="background: rgba(0,0,0,0.04);">
                      <td class="font-weight-bold">{{ si === 1 ? 'Sit' : '' }}</td>
                      <td v-for="(inn, innIdx) in innings" :key="inn.number"
                          class="text-center drag-cell"
                          :class="{ 'drag-target': isDragOver(innIdx,'sit',si-1) }"
                          @dragover.prevent="dragOverCell={innIdx,type:'sit',key:si-1}"
                          @dragleave.self="dragOverCell=null"
                          @drop.prevent="onDrop(innIdx,'sit',si-1)">
                        <span v-if="inn.sitting[si-1]" draggable="true" class="draggable-player text-medium-emphasis"
                              @dragstart.stop="dragSrc={innIdx,type:'sit',key:si-1}">
                          {{ displayName(inn.sitting[si - 1]) }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </v-table>
                </div>
              </v-card>
            </v-col>
          </v-row>
          <v-row v-else class="mt-6">
            <v-col cols="12" class="text-center text-medium-emphasis">
              <v-icon size="48" class="mb-2">mdi-calendar-blank-outline</v-icon>
              <div>Set innings and leniency above, then click <strong>Generate Schedule</strong>.</div>
            </v-col>
          </v-row>

        </template>

        <!-- ── ROSTER ── -->
        <template v-else-if="page === 'roster'">
          <v-row class="mb-2">
            <v-col cols="7">
              <v-text-field
                id="player-input"
                v-model="newPlayer"
                label="Player name"
                variant="outlined"
                density="compact"
                hide-details
                @keyup.enter="focusNumberInput"
              ></v-text-field>
            </v-col>
            <v-col cols="3">
              <v-text-field
                id="player-number"
                v-model.number="newPlayerNumber"
                label="#"
                variant="outlined"
                density="compact"
                hide-details
                type="number"
                @keyup.enter="addPlayer"
              ></v-text-field>
            </v-col>
            <v-col cols="2">
              <v-btn color="primary" block height="40" @click="addPlayer">Add</v-btn>
            </v-col>
          </v-row>

          <v-row v-if="players.length === 0">
            <v-col cols="12" class="text-center text-medium-emphasis py-8">
              <v-icon size="48" class="mb-2">mdi-account-plus-outline</v-icon>
              <div>No players yet. Add one above.</div>
            </v-col>
          </v-row>
          <v-row v-else>
            <v-col
              v-for="(player, index) in players"
              :key="index"
              cols="12" sm="6" md="4"
            >
              <v-card variant="outlined">
                <v-card-title class="py-2 px-3">
                  <div class="d-flex align-center justify-space-between">
                    <template v-if="player.isEditing">
                      <v-text-field
                        v-model="player.editName"
                        label="Name"
                        variant="outlined"
                        density="compact"
                        hide-details
                        style="max-width: 65%"
                        @keyup.enter="savePlayer(index)"
                      ></v-text-field>
                      <v-text-field
                        v-model.number="player.editNumber"
                        label="#"
                        variant="outlined"
                        density="compact"
                        hide-details
                        type="number"
                        style="max-width: 30%"
                        @keyup.enter="savePlayer(index)"
                      ></v-text-field>
                    </template>
                    <template v-else>
                      <span class="text-truncate" style="max-width: 75%; font-size: 0.95rem;">{{ player.name }}</span>
                      <span class="text-medium-emphasis" style="font-size: 0.95rem;">{{ player.number ? `#${player.number}` : '' }}</span>
                    </template>
                  </div>
                </v-card-title>
                <v-card-text class="pb-1 px-3">
                  <v-btn
                    v-for="pos in cardPositions"
                    :key="pos"
                    :color="player.positions[pos] === 2 ? 'success' : player.positions[pos] === 1 ? 'warning' : undefined"
                    :variant="player.positions[pos] > 0 ? 'flat' : 'outlined'"
                    size="x-small"
                    class="mr-1 mb-1"
                    @click="togglePositionPriority(player, pos)"
                  >{{ pos }}</v-btn>
                </v-card-text>
                <v-card-actions class="pt-0 px-3 pb-2">
                  <v-btn v-if="!player.isEditing" color="warning" variant="tonal" size="small" @click="editPlayer(index)">Edit</v-btn>
                  <v-btn v-else color="success" variant="tonal" size="small" @click="savePlayer(index)">Save</v-btn>
                  <v-btn color="error" variant="tonal" size="small" @click="removePlayer(index)">Remove</v-btn>
                </v-card-actions>
              </v-card>
            </v-col>
          </v-row>
        </template>

        <!-- ── SCHEDULES ── -->
        <template v-else-if="page === 'schedules'">
          <div v-if="savedSchedules.length === 0" class="text-center text-medium-emphasis py-8">
            <v-icon size="48" class="mb-2">mdi-calendar-blank-outline</v-icon>
            <div>No saved schedules yet. Generate one on the Home page and click <strong>Save</strong>.</div>
          </div>
          <v-list v-else lines="two" class="pa-0">
            <v-list-item
              v-for="s in savedSchedules"
              :key="s.id"
              rounded="lg"
              class="mb-2"
              border
              :style="activeScheduleId === s.id ? 'background:rgba(var(--v-theme-primary),0.06)' : ''"
              @dblclick="loadSchedule(s); page = 'home'"
            >
              <template #prepend>
                <v-icon color="primary" class="mr-2">mdi-calendar-check-outline</v-icon>
              </template>
              <template #title>
                <span
                  class="font-weight-semibold text-primary"
                  style="cursor:pointer; text-decoration:underline; text-underline-offset:2px;"
                  @click.stop="loadSchedule(s); page = 'home'"
                >{{ s.name }}</span>
              </template>
              <template #subtitle>
                {{ s.date }} &nbsp;&middot;&nbsp; {{ s.innings.length }} innings &nbsp;&middot;&nbsp; {{ s.playerCount }} players
              </template>
              <template #append>
                <v-btn
                  size="small" variant="tonal" color="primary" class="mr-1"
                  @click="loadSchedule(s); page = 'home'"
                >View</v-btn>
                <v-btn size="small" variant="tonal" color="error" icon="mdi-delete" @click="deleteSchedule(s.id)"></v-btn>
              </template>
            </v-list-item>
          </v-list>
        </template>

      </v-container>
    </v-main>

    <!-- Save Schedule Dialog -->
    <v-dialog v-model="showSaveDialog" max-width="400">
      <v-card>
        <v-card-title class="pt-4 px-4">Save Schedule</v-card-title>
        <v-card-text class="px-4 pb-2">
          <v-text-field
            v-model="saveName"
            label="Schedule name (e.g. Game 1 vs Tigers)"
            variant="outlined"
            density="compact"
            autofocus
            @keyup.enter="confirmSave"
          ></v-text-field>
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showSaveDialog = false">Cancel</v-btn>
          <v-btn color="primary" variant="flat" :disabled="!saveName.trim()" @click="confirmSave">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Save toast -->
    <v-snackbar v-model="saveToast" :timeout="2000" color="success" location="bottom">
      <v-icon start>mdi-check-circle-outline</v-icon>
      Schedule saved successfully
    </v-snackbar>

  </v-app>
</template>


<script>
// Keys stored per player
const STORED_POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'OF'];
// Buttons shown in roster card
const CARD_POSITIONS = ['1B', '2B', '3B', 'SS', 'OF'];
// Auto-scheduled field positions (C excluded — manual only)
const AUTO_FIELD_POSITIONS = ['1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
// OF slots map to stored key 'OF'
const OF_SLOTS = new Set(['LF', 'CF', 'RF']);

// Mulberry32 seeded PRNG — deterministic but fresh each generation
function makePRNG(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rand) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default {
  data() {
    return {
      players: [],
      newPlayer: '',
      newPlayerNumber: null,
      numInnings: 4,
      leniency: 3,
      innings: [],
      scheduleError: '',
      pitcherSlots: [{ player: '', innings: [] }],
      catcherSlots: [{ player: '', innings: [] }],
      dragSrc: null,
      dragOverCell: null,
      dragPins: {},
      undoStack: [],
      savedSchedules: [],
      showSaveDialog: false,
      saveName: '',
      saveToast: false,
      activeScheduleId: null,
      manualMode: false,
      inactivePlayers: [],
      page: 'home',
      drawer: false,
    };
  },
  computed: {
    playerNames() { return this.players.map(p => p.name); },
    activePlayerNames() {
      const inactive = new Set(this.inactivePlayers);
      return this.players.map(p => p.name).filter(n => !inactive.has(n));
    },
    cardPositions() { return CARD_POSITIONS; },
    autoFieldPositions() { return AUTO_FIELD_POSITIONS; },
    pageTitle() {
      return { home: 'Schedule Builder', roster: 'Roster', schedules: 'Saved Schedules' }[this.page] || '';
    },
    activeScheduleIndex() {
      if (!this.activeScheduleId) return -1;
      return this.savedSchedules.findIndex(s => s.id === this.activeScheduleId);
    },
    leniencyLabel() {
      return ['','Very Loose (fill any slot)','Loose','Balanced','Strict','Very Strict (green only)'][this.leniency];
    },
    sitRowCount() {
      if (!this.innings.length) return 0;
      return Math.max(...this.innings.map(inn => inn.sitting.length));
    },
    sitFairnessWarning() {
      // Scan innings sequentially. Before recording sitters, check whether any sitter
      // has more prior sits than any player who is active that inning.
      // Violation = "no one sits twice before everyone has sat once" broken.
      const counts = {};
      for (const p of this.players) counts[p.name] = 0;
      const violations = [];
      for (const inn of this.innings) {
        const active = [
          inn.pitcher, inn.catcher,
          ...Object.values(inn.assignments).filter(v => v && v !== 'OPEN'),
        ].filter(Boolean);
        for (const sitter of inn.sitting) {
          const sitterCount = counts[sitter] ?? 0;
          const overtaken = active.find(a => (counts[a] ?? 0) < sitterCount);
          if (overtaken !== undefined) {
            violations.push(
              `Inn ${inn.number}: ${sitter} sits (${sitterCount}× before) while ${overtaken} plays (${counts[overtaken] ?? 0}× before)`
            );
          }
        }
        for (const sitter of inn.sitting) counts[sitter] = (counts[sitter] ?? 0) + 1;
      }
      return violations;
    },
  },
  methods: {
    focusNumberInput() {
      this.$nextTick(() => { const el = document.getElementById('player-number'); if (el) el.focus(); });
    },
    addPlayer() {
      if (this.newPlayer.trim()) {
        this.players.push({
          name: this.newPlayer.trim(),
          number: this.newPlayerNumber,
          positions: STORED_POSITIONS.reduce((acc, pos) => { acc[pos] = 0; return acc; }, {}),
          isEditing: false, editName: '', editNumber: null,
        });
        this.newPlayer = '';
        this.newPlayerNumber = null;
        this.saveData();
        this.$nextTick(() => { const el = document.getElementById('player-input'); if (el) el.focus(); });
      }
    },
    removePlayer(index) {
      const p = this.players[index];
      if (!window.confirm(`Remove ${p.name} from the roster?`)) return;
      this.players.splice(index, 1);
      this.saveData();
    },
    togglePositionPriority(player, position) {
      const cur = player.positions[position] || 0;
      player.positions[position] = cur === 0 ? 2 : cur === 2 ? 1 : 0;
      this.saveData();
    },
    editPlayer(index) {
      const p = this.players[index];
      p.isEditing = true; p.editName = p.name; p.editNumber = p.number;
    },
    savePlayer(index) {
      const p = this.players[index];
      if (p.editName.trim()) { p.name = p.editName.trim(); p.number = p.editNumber; }
      p.isEditing = false;
      this.saveData();
    },
    toggleInningSlot(slot, n) {
      const idx = slot.innings.indexOf(n);
      if (idx === -1) slot.innings.push(n);
      else slot.innings.splice(idx, 1);
    },
    pitcherInningsTaken(si) {
      const taken = new Set();
      this.pitcherSlots.forEach((s, i) => { if (i !== si) s.innings.forEach(n => taken.add(n)); });
      return taken;
    },
    catcherInningsTaken(si) {
      const taken = new Set();
      this.catcherSlots.forEach((s, i) => { if (i !== si) s.innings.forEach(n => taken.add(n)); });
      return taken;
    },
    displayName(name) {
      if (!name) return '';
      const p = this.players.find(pl => pl.name === name);
      return p && p.number ? `#${p.number} ${p.name}` : name;
    },

    generateSchedule() {
      this.scheduleError = '';
      this.innings = [];
      this.dragPins = {};
      this.undoStack = [];
      this.manualMode = false;
      const inactiveSet = new Set(this.inactivePlayers);
      const players = this.players.filter(p => !inactiveSet.has(p.name));
      const N = players.length;
      const numInnings = Math.max(1, this.numInnings || 1);
      const leniency = this.leniency;
      const rand = makePRNG(Date.now());

      if (N < 9) { this.scheduleError = `Need at least 9 players (have ${N}${inactiveSet.size ? ` active` : ''}).`; return; }

      // Build per-inning manual maps
      // pitcherMap[inningNumber] = playerName
      const pitcherMap = {};
      for (const slot of this.pitcherSlots) {
        if (slot.player) slot.innings.forEach(n => { pitcherMap[n] = slot.player; });
      }
      const catcherMap = {};
      for (const slot of this.catcherSlots) {
        if (slot.player) slot.innings.forEach(n => { catcherMap[n] = slot.player; });
      }

      // Active players per inning = 9 (1P + 1C + 7 field)
      const sitsPerInning = N - 9;
      const sitCounts = players.map(() => 0);
      const lastSatInning = players.map(() => -Infinity);
      const result = [];

      // Leniency → minimum position priority allowed as a fallback
      // 1=anyone, 2=prio>=1 or anyone, 3=prio>=1, 4=prio>=2 or prio>=1, 5=prio>=2 only
      const minPri = leniency <= 1 ? 0 : leniency <= 3 ? 1 : 2;
      const storedKey = pos => OF_SLOTS.has(pos) ? 'OF' : pos;

      for (let i = 0; i < numInnings; i++) {
        const innNum = i + 1;
        const manualPitcher = pitcherMap[innNum] || null;
        const manualCatcher = catcherMap[innNum] || null;
        const manuallyLocked = new Set([manualPitcher, manualCatcher].filter(Boolean));

        // --- Pick sitters (cannot include manually locked players) ---
        let sitting = [];
        // sitterMeta lets us undo a sit if we need to pull someone back for an OPEN slot
        let sitterMeta = [];
        if (sitsPerInning > 0) {
          // Shuffle first so ties (equal sitCount + lastSatInning) are broken randomly,
          // not always by roster order. Sort is stable on top of the shuffle.
          const eligible = shuffle(
            players.map((p, idx) => ({ idx, name: p.name })).filter(x => !manuallyLocked.has(x.name)),
            rand
          ).sort((a, b) => {
            if (sitCounts[a.idx] !== sitCounts[b.idx]) return sitCounts[a.idx] - sitCounts[b.idx];
            if (lastSatInning[a.idx] !== lastSatInning[b.idx]) return lastSatInning[a.idx] - lastSatInning[b.idx];
            return 0;
          });
          // Position-aware: don't bench someone if it strands a field position
          const sitterNames = this.selectSitters(eligible, sitsPerInning, manuallyLocked);
          sitterMeta = sitterNames.map(name => {
            const s = eligible.find(x => x.name === name);
            return { idx: s.idx, name, prevLastSat: lastSatInning[s.idx] };
          });
          sitting = sitterMeta.map(s => s.name);
          sitterMeta.forEach(s => { sitCounts[s.idx]++; lastSatInning[s.idx] = i; });
        }

        const sittingSet = new Set(sitting);
        const available = players.filter(p => !sittingSet.has(p.name));

        // --- Pitcher ---
        let pitcher;
        if (manualPitcher) {
          pitcher = players.find(p => p.name === manualPitcher) || available[0];
        } else {
          const ranked = shuffle(available, rand).sort((a, b) => (b.positions['P'] || 0) - (a.positions['P'] || 0));
          pitcher = ranked[0];
        }

        // --- Catcher ---
        let catcher = null;
        if (manualCatcher) {
          catcher = players.find(p => p.name === manualCatcher)?.name || null;
        }
        // C is not auto-assigned — manual only

        const usedByPandC = new Set([pitcher?.name, catcher].filter(Boolean));
        const fieldAvailable = available.filter(p => !usedByPandC.has(p.name));

        // --- Assign 7 auto field positions (most-constrained first) ---
        const posScarcity = AUTO_FIELD_POSITIONS
          .map(pos => ({ pos, count: fieldAvailable.filter(p => (p.positions[storedKey(pos)] || 0) > 0).length }))
          .sort((a, b) => a.count - b.count);

        const usedPlayers = new Set();
        const assignments = {};

        for (const { pos } of posScarcity) {
          const sk = storedKey(pos);
          // Shuffle within each priority tier for variance
          const high  = shuffle(fieldAvailable.filter(p => (p.positions[sk] || 0) === 2 && !usedPlayers.has(p.name)), rand);
          const low   = shuffle(fieldAvailable.filter(p => (p.positions[sk] || 0) === 1 && !usedPlayers.has(p.name)), rand);
          const free  = shuffle(fieldAvailable.filter(p => !usedPlayers.has(p.name)), rand);

          // Strict: only use candidates that meet minPri threshold; OPEN if none
          let pick;
          if (high.length) {
            pick = high[0];
          } else if (low.length && minPri <= 1) {
            pick = low[0];
          } else if (free.length && minPri === 0) {
            pick = free[0];
          } else if (low.length && minPri <= 1) {
            pick = low[0];
          } else if (free.length && leniency <= 2) {
            pick = free[0];
          }
          // For leniency 3: fall back to prio>=1, else OPEN
          if (!pick && leniency <= 3 && low.length) pick = low[0];
          // For leniency 1-2: absolute fallback to anyone
          if (!pick && leniency <= 2 && free.length) pick = free[0];

          if (pick) { assignments[pos] = pick.name; usedPlayers.add(pick.name); }
          else { assignments[pos] = 'OPEN'; }
        }

        // --- Fill any OPEN slots ---
        // Pass 1: use any unassigned fieldAvailable player (leniency ignored — no player left behind)
        // Pass 2: only if truly no fieldAvailable player left, rescue a sitter
        for (const pos of AUTO_FIELD_POSITIONS) {
          if (assignments[pos] !== 'OPEN') continue;
          // Try leftover field players first (position priority ignored)
          const leftover = shuffle(fieldAvailable.filter(p => !usedPlayers.has(p.name)), rand);
          if (leftover.length) {
            assignments[pos] = leftover[0].name;
            usedPlayers.add(leftover[0].name);
          } else if (sitting.length > 0) {
            // Rescue the last sitter (least-due; undo their sit)
            const rescuedName = sitting.pop();
            const meta = sitterMeta.find(s => s.name === rescuedName);
            if (meta) { sitCounts[meta.idx]--; lastSatInning[meta.idx] = meta.prevLastSat; }
            assignments[pos] = rescuedName;
          }
        }

        result.push({ number: innNum, pitcher: pitcher?.name || '', catcher, sitting, assignments });
      }

      this.innings = result;
    },

    // ── Saved schedules ────────────────────────────────────────────
    openSaveDialog() {
      if (this.activeScheduleId) {
        // Existing schedule — save immediately without dialog
        const existing = this.savedSchedules.find(s => s.id === this.activeScheduleId);
        if (existing) {
          this.saveName = existing.name;
          this.confirmSave();
          return;
        }
      }
      this.saveName = '';
      this.showSaveDialog = true;
    },
    confirmSave() {
      const name = this.saveName.trim();
      if (!name) return;
      if (this.activeScheduleId) {
        // Update existing record in-place
        const idx = this.savedSchedules.findIndex(s => s.id === this.activeScheduleId);
        if (idx !== -1) {
          this.savedSchedules[idx] = {
            ...this.savedSchedules[idx],
            name,
            date: new Date().toLocaleDateString(),
            playerCount: this.players.length,
            innings: JSON.parse(JSON.stringify(this.innings)),
            players: JSON.parse(JSON.stringify(this.players)),
            pitcherSlots: JSON.parse(JSON.stringify(this.pitcherSlots)),
            catcherSlots: JSON.parse(JSON.stringify(this.catcherSlots)),
            inactivePlayers: [...this.inactivePlayers],
          };
          this.persistSavedSchedules();
          this.showSaveDialog = false;
          this.saveToast = true;
          return;
        }
      }
      // No active schedule — create new
      const record = {
        id: Date.now(),
        name,
        date: new Date().toLocaleDateString(),
        playerCount: this.players.length,
        innings: JSON.parse(JSON.stringify(this.innings)),
        players: JSON.parse(JSON.stringify(this.players)),
        pitcherSlots: JSON.parse(JSON.stringify(this.pitcherSlots)),
        catcherSlots: JSON.parse(JSON.stringify(this.catcherSlots)),
        inactivePlayers: [...this.inactivePlayers],
      };
      this.savedSchedules.unshift(record);
      this.activeScheduleId = record.id;
      this.persistSavedSchedules();
      this.showSaveDialog = false;
      this.saveToast = true;
    },
    loadSchedule(s) {
      this.innings = JSON.parse(JSON.stringify(s.innings));
      // Restore pitcher slots — reconstruct from innings data if not saved
      if (s.pitcherSlots) {
        this.pitcherSlots = JSON.parse(JSON.stringify(s.pitcherSlots));
      } else {
        const map = {};
        s.innings.forEach((inn, i) => {
          if (inn.pitcher) { (map[inn.pitcher] = map[inn.pitcher] || []).push(i + 1); }
        });
        const slots = Object.entries(map).map(([player, innings]) => ({ player, innings }));
        this.pitcherSlots = slots.length ? slots : [{ player: '', innings: [] }];
      }
      // Restore catcher slots — reconstruct from innings data if not saved
      if (s.catcherSlots) {
        this.catcherSlots = JSON.parse(JSON.stringify(s.catcherSlots));
      } else {
        const map = {};
        s.innings.forEach((inn, i) => {
          if (inn.catcher) { (map[inn.catcher] = map[inn.catcher] || []).push(i + 1); }
        });
        const slots = Object.entries(map).map(([player, innings]) => ({ player, innings }));
        this.catcherSlots = slots.length ? slots : [{ player: '', innings: [] }];
      }
      this.dragPins = {};
      this.undoStack = [];
      this.activeScheduleId = s.id;
      this.inactivePlayers = s.inactivePlayers ? [...s.inactivePlayers] : [];
    },
    goHome() {
      this.innings = [];
      this.scheduleError = '';
      this.activeScheduleId = null;
      this.dragPins = {};
      this.undoStack = [];
      this.manualMode = false;
      this.inactivePlayers = [];
      this.pitcherSlots = [{ player: '', innings: [] }];
      this.catcherSlots = [{ player: '', innings: [] }];
      this.page = 'home';
      this.drawer = false;
    },
    prevSchedule() {
      const idx = this.activeScheduleIndex;
      if (idx > 0) this.loadSchedule(this.savedSchedules[idx - 1]);
    },
    nextSchedule() {
      const idx = this.activeScheduleIndex;
      if (idx < this.savedSchedules.length - 1) this.loadSchedule(this.savedSchedules[idx + 1]);
    },
    deleteSchedule(id) {
      const s = this.savedSchedules.find(x => x.id === id);
      if (!window.confirm(`Delete "${s ? s.name : 'this schedule'}"? This cannot be undone.`)) return;
      this.savedSchedules = this.savedSchedules.filter(s => s.id !== id);
      if (this.activeScheduleId === id) this.activeScheduleId = null;
      this.persistSavedSchedules();
    },
    persistSavedSchedules() {
      localStorage.setItem('savedSchedules', JSON.stringify(this.savedSchedules));
    },
    // ── Drag & drop ──────────────────────────────────────────────
    // Position-aware sitter selection.
    // Walks candidates in fairness order; skips anyone whose benching would leave
    // any AUTO_FIELD_POSITION with zero qualified players (priority > 0) remaining.
    // Falls back to unconstrained selection if not enough sitters can be found.
    selectSitters(eligible, needed, lockedNames) {
      const players = this.players;
      const chosen = new Set();
      // Pass 1: only pick sitters that don't strand any field position
      for (const cand of eligible) {
        if (chosen.size >= needed) break;
        const strands = AUTO_FIELD_POSITIONS.some(pos => {
          const sk = OF_SLOTS.has(pos) ? 'OF' : pos;
          return !players.some(p =>
            p.name !== cand.name &&
            !chosen.has(p.name) &&
            !lockedNames.has(p.name) &&
            (p.positions[sk] || 0) > 0
          );
        });
        if (!strands) chosen.add(cand.name);
      }
      // Pass 2: fill any remaining slots ignoring position constraints
      for (const cand of eligible) {
        if (chosen.size >= needed) break;
        if (!chosen.has(cand.name)) chosen.add(cand.name);
      }
      return [...chosen];
    },
    isDragOver(innIdx, type, key) {
      return this.dragOverCell &&
        this.dragOverCell.innIdx === innIdx &&
        this.dragOverCell.type === type &&
        this.dragOverCell.key === key;
    },
    onDrop(innIdx, type, key) {
      this.dragOverCell = null;
      if (!this.dragSrc) return;
      const src = this.dragSrc;
      this.dragSrc = null;
      // same cell — no-op
      if (src.innIdx === innIdx && src.type === type && src.key === key) return;
      // only within the same inning
      if (src.innIdx !== innIdx) return;
      const playerName = this.getCellPlayer(innIdx, src.type, src.key);
      if (!playerName) return;

      // Snapshot for undo before making changes
      this.pushUndo();

      if (this.manualMode) {
        // Raw swap — no regen, no pins. Just exchange the two cell values directly.
        const dstName = this.getCellPlayer(innIdx, type, key);
        this.setCellPlayer(innIdx, src.type, src.key, dstName);
        this.setCellPlayer(innIdx, type, key, playerName);
        this.innings = [...this.innings]; // trigger reactivity
        return;
      }

      // Algorithm mode: record a pin and regen from this inning inclusive.
      const pins = this.dragPins[innIdx] ? { ...this.dragPins[innIdx], field: { ...this.dragPins[innIdx].field }, sit: [...this.dragPins[innIdx].sit] } : { field: {}, sit: [] };
      // Remove any existing pin for this player in this inning
      for (const pos of Object.keys(pins.field)) {
        if (pins.field[pos] === playerName) delete pins.field[pos];
      }
      const si = pins.sit.indexOf(playerName);
      if (si !== -1) pins.sit.splice(si, 1);
      // Apply new pin at destination
      if (type === 'sit') {
        pins.sit.push(playerName);
      } else {
        // type is 'p', 'c', or 'pos' (key = field position)
        const pinKey = type === 'pos' ? key : type;
        pins.field[pinKey] = playerName;
      }
      this.dragPins = { ...this.dragPins, [innIdx]: pins };
      // Re-run algorithm from this inning inclusive — it handles sit fairness
      this.regenForward(innIdx);
    },
    getCellPlayer(innIdx, type, key) {
      const inn = this.innings[innIdx];
      if (type === 'p') return inn.pitcher || '';
      if (type === 'c') return inn.catcher || '';
      if (type === 'sit') return inn.sitting[key] || '';
      return inn.assignments[key] || '';
    },
    setCellPlayer(innIdx, type, key, name) {
      const inn = this.innings[innIdx];
      if (type === 'p') { inn.pitcher = name || ''; return; }
      if (type === 'c') { inn.catcher = name || null; return; }
      if (type === 'sit') {
        if (name) inn.sitting[key] = name;
        else inn.sitting.splice(key, 1);
        return;
      }
      inn.assignments[key] = name || 'OPEN';
    },
    regenForward(fromInnIdx) {
      if (fromInnIdx >= this.innings.length) return;
      const players = this.players;
      const N = players.length;
      const numInnings = this.innings.length;
      const leniency = this.leniency;
      const rand = makePRNG(Date.now());
      const pitcherMap = {};
      for (const slot of this.pitcherSlots) {
        if (slot.player) slot.innings.forEach(n => { pitcherMap[n] = slot.player; });
      }
      const catcherMap = {};
      for (const slot of this.catcherSlots) {
        if (slot.player) slot.innings.forEach(n => { catcherMap[n] = slot.player; });
      }
      // Replay sit history from locked innings before fromInnIdx
      const sitCounts = players.map(() => 0);
      const lastSatInning = players.map(() => -Infinity);
      for (let i = 0; i < fromInnIdx; i++) {
        for (const name of (this.innings[i].sitting || [])) {
          const idx = players.findIndex(p => p.name === name);
          if (idx >= 0) { sitCounts[idx]++; lastSatInning[idx] = i; }
        }
      }
      const sitsPerInning = N - 9;
      const minPri = leniency <= 1 ? 0 : leniency <= 3 ? 1 : 2;
      const storedKey = pos => OF_SLOTS.has(pos) ? 'OF' : pos;
      for (let i = fromInnIdx; i < numInnings; i++) {
        const innNum = i + 1;
        const pins = this.dragPins[i] || { field: {}, sit: [] };
        const pinnedField = pins.field || {};
        const pinnedSitNames = pins.sit || [];
        // Pitcher/catcher: drag-pin > manual slot > algorithm
        const manualPitcher = pinnedField['p'] || pitcherMap[innNum] || null;
        const manualCatcher = pinnedField['c'] || catcherMap[innNum] || null;
        const manuallyLocked = new Set([manualPitcher, manualCatcher].filter(Boolean));
        // All players whose placement is forced (excluded from normal pool)
        const allPinned = new Set([...Object.values(pinnedField), ...pinnedSitNames].filter(Boolean));
        // Forced sitters (sit pins minus anyone locked to P/C)
        const forcedSitters = pinnedSitNames.filter(n => !manuallyLocked.has(n));
        // --- Build sitter list: forced first, then algorithmic ---
        let sitting = [];
        let sitterMeta = [];
        for (const name of forcedSitters) {
          const idx = players.findIndex(p => p.name === name);
          if (idx >= 0) {
            sitterMeta.push({ idx, name, prevLastSat: lastSatInning[idx] });
            sitting.push(name);
            sitCounts[idx]++;
            lastSatInning[idx] = i;
          }
        }
        const remainingSits = Math.max(0, sitsPerInning - sitting.length);
        if (remainingSits > 0) {
          const eligible = shuffle(
            players.map((p, idx) => ({ idx, name: p.name })).filter(x => !manuallyLocked.has(x.name) && !allPinned.has(x.name)),
            rand
          ).sort((a, b) => {
            if (sitCounts[a.idx] !== sitCounts[b.idx]) return sitCounts[a.idx] - sitCounts[b.idx];
            if (lastSatInning[a.idx] !== lastSatInning[b.idx]) return lastSatInning[a.idx] - lastSatInning[b.idx];
            return 0;
          });
          // lockedForCheck = P/C + forced sit pins already placed (they can't cover field positions)
          const lockedForCheck = new Set([...manuallyLocked, ...sitting]);
          const moreSitterNames = this.selectSitters(eligible, remainingSits, lockedForCheck);
          for (const name of moreSitterNames) {
            const s = eligible.find(x => x.name === name);
            sitterMeta.push({ idx: s.idx, name, prevLastSat: lastSatInning[s.idx] });
            sitting.push(name);
            sitCounts[s.idx]++;
            lastSatInning[s.idx] = i;
          }
        }
        const sittingSet = new Set(sitting);
        const available = players.filter(p => !sittingSet.has(p.name));
        // --- Pitcher ---
        let pitcher;
        if (manualPitcher) pitcher = players.find(p => p.name === manualPitcher) || available[0];
        else pitcher = shuffle(available.filter(p => !allPinned.has(p.name) || pinnedField['p'] === p.name), rand).sort((a, b) => (b.positions['P'] || 0) - (a.positions['P'] || 0))[0];
        // --- Catcher ---
        const catcher = manualCatcher || null;
        const usedByPandC = new Set([pitcher?.name, catcher].filter(Boolean));
        // --- Pre-place pinned field positions ---
        const usedPlayers = new Set([...usedByPandC]);
        const assignments = {};
        for (const [pos, name] of Object.entries(pinnedField)) {
          if (pos === 'p' || pos === 'c') continue;
          if (!sittingSet.has(name) && !usedPlayers.has(name)) {
            assignments[pos] = name;
            usedPlayers.add(name);
          }
        }
        // --- Assign remaining positions algorithmically ---
        const fieldAvailable = available.filter(p => !usedPlayers.has(p.name));
        const posToAssign = AUTO_FIELD_POSITIONS.filter(pos => !assignments[pos]);
        const posScarcity = posToAssign
          .map(pos => ({ pos, count: fieldAvailable.filter(p => (p.positions[storedKey(pos)] || 0) > 0).length }))
          .sort((a, b) => a.count - b.count);
        for (const { pos } of posScarcity) {
          const sk = storedKey(pos);
          const high = shuffle(fieldAvailable.filter(p => (p.positions[sk] || 0) === 2 && !usedPlayers.has(p.name)), rand);
          const low  = shuffle(fieldAvailable.filter(p => (p.positions[sk] || 0) === 1 && !usedPlayers.has(p.name)), rand);
          const free = shuffle(fieldAvailable.filter(p => !usedPlayers.has(p.name)), rand);
          let pick;
          if (high.length) pick = high[0];
          else if (low.length && minPri <= 1) pick = low[0];
          else if (free.length && minPri === 0) pick = free[0];
          if (!pick && leniency <= 3 && low.length) pick = low[0];
          if (!pick && leniency <= 2 && free.length) pick = free[0];
          if (pick) { assignments[pos] = pick.name; usedPlayers.add(pick.name); }
          else { assignments[pos] = 'OPEN'; }
        }
        // --- Fill OPEN slots ---
        for (const pos of AUTO_FIELD_POSITIONS) {
          if (assignments[pos] !== 'OPEN') continue;
          const leftover = shuffle(fieldAvailable.filter(p => !usedPlayers.has(p.name)), rand);
          if (leftover.length) { assignments[pos] = leftover[0].name; usedPlayers.add(leftover[0].name); }
          else if (sitting.length > 0) {
            const rescuedName = sitting.pop();
            const meta = sitterMeta.find(s => s.name === rescuedName);
            if (meta) { sitCounts[meta.idx]--; lastSatInning[meta.idx] = meta.prevLastSat; }
            assignments[pos] = rescuedName;
          }
        }
        this.innings[i] = { number: innNum, pitcher: pitcher?.name || '', catcher, sitting, assignments };
      }
      this.innings = [...this.innings];
    },
    // ── Undo ─────────────────────────────────────────────────────
    pushUndo() {
      this.undoStack.push({
        innings: JSON.parse(JSON.stringify(this.innings)),
        dragPins: JSON.parse(JSON.stringify(this.dragPins)),
      });
      // Cap the stack at 50 entries to avoid unbounded memory use
      if (this.undoStack.length > 50) this.undoStack.splice(0, this.undoStack.length - 50);
    },
    undo() {
      if (this.undoStack.length === 0) return;
      const snapshot = this.undoStack.pop();
      this.innings = snapshot.innings;
      this.dragPins = snapshot.dragPins;
    },
    // ── Persistence ─────────────────────────────────────────────
    saveData() {
      localStorage.setItem('players', JSON.stringify(this.players));
    },
    migratePositions(raw) {
      const keyMap = {
        'P': 'P', 'Pitcher': 'P',
        'C': 'C', 'Catcher': 'C',
        '1B': '1B', 'First Base': '1B',
        '2B': '2B', 'Second Base': '2B',
        '3B': '3B', 'Third Base': '3B',
        'SS': 'SS', 'Shortstop': 'SS',
        'OF': 'OF', 'LF': 'OF', 'Left Field': 'OF',
        'CF': 'OF', 'Center Field': 'OF',
        'RF': 'OF', 'Right Field': 'OF',
      };
      const out = STORED_POSITIONS.reduce((acc, pos) => { acc[pos] = 0; return acc; }, {});
      for (const [k, val] of Object.entries(raw || {})) {
        const target = keyMap[k];
        if (!target) continue;
        const v = (val == null) ? 0 : val;
        if (v > (out[target] || 0)) out[target] = v;
      }
      return out;
    },
    loadData() {
      const saved = localStorage.getItem('players');
      if (saved) {
        this.players = JSON.parse(saved).map(player => ({
          ...player,
          positions: this.migratePositions(player.positions),
          isEditing: false, editName: '', editNumber: null,
        }));
        this.saveData();
      }
      const savedSched = localStorage.getItem('savedSchedules');
      if (savedSched) this.savedSchedules = JSON.parse(savedSched);
    },
  },
  mounted() {
    this.loadData();
    this._keyHandler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        if (this.innings.length > 0 && this.undoStack.length > 0 && this.page === 'home') {
          e.preventDefault();
          this.undo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        if (this.innings.length > 0 && this.page === 'home') {
          e.preventDefault();
          this.openSaveDialog();
        }
      }
    };
    window.addEventListener('keydown', this._keyHandler);
  },
  beforeUnmount() {
    if (this._keyHandler) window.removeEventListener('keydown', this._keyHandler);
  },
};
</script>

<style scoped>
.draggable-player {
  cursor: grab;
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  transition: background 0.1s;
  user-select: none;
}
.draggable-player:hover {
  background: rgba(var(--v-theme-primary), 0.12);
}
.draggable-player:active {
  cursor: grabbing;
}
.drag-cell {
  transition: background 0.1s;
}
.drag-target {
  background: rgba(var(--v-theme-primary), 0.18) !important;
  outline: 2px dashed rgba(var(--v-theme-primary), 0.6);
  outline-offset: -2px;
}
</style>

