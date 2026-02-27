import { createApp } from 'vue';
import { createVuetify } from 'vuetify';
import 'vuetify/styles';
import { aliases, mdi } from 'vuetify/iconsets/mdi';

const vuetify = createVuetify({
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
});

const app = createApp({
  data() {
    return {
      players: [],
      newPlayer: '',
      newPlayerNumber: null,
      schedule: [],
      positions: ['C', '1B', '2B', 'SS', '3B', 'OF']
    };
  },
  methods: {
    addPlayer() {
      if (this.newPlayer.trim()) {
        this.players.push({
          name: this.newPlayer.trim(),
          number: this.newPlayerNumber,
          positions: this.positions.reduce((acc, position) => {
            acc[position] = 0; // 0 = cannot play, 1 = could play, 2 = high priority
            return acc;
          }, {}),
          isEditing: false,
          editName: '',
          editNumber: null
        });
        this.newPlayer = '';
        this.newPlayerNumber = null;
        this.saveData();
        this.$nextTick(() => {
          document.getElementById('player-input').focus();
        });
      }
    },
    focusNumberInput() {
      const numberInput = document.getElementById('player-number');
      if (numberInput) {
        numberInput.focus();
      }
    },
    removePlayer(index) {
      this.players.splice(index, 1);
      this.saveData();
    },
    togglePositionPriority(player, position) {
      if (player.positions[position] === 0) {
        player.positions[position] = 2; // High priority
      } else if (player.positions[position] === 1) {
        player.positions[position] = 0; // Cannot play
      } else {
        player.positions[position] = 1; // Low priority
      }
      this.saveData();
    },
    editPlayer(index) {
      const player = this.players[index];
      player.isEditing = true;
      player.editName = player.name;
      player.editNumber = player.number;
      this.$nextTick(() => {
        const input = document.querySelectorAll('.v-text-field input')[index * 2];
        if (input) {
          input.focus();
        }
      });
    },
    savePlayer(index) {
      const player = this.players[index];
      if (player.editName.trim() !== '') {
        player.name = player.editName.trim();
        player.number = player.editNumber;
      }
      player.isEditing = false;
      this.saveData();
    },
    generateSchedule() {
      this.schedule = this.positions.map((position, index) => {
        const availablePlayers = this.players.filter(player => player.positions[position] === 2);
        if (availablePlayers.length > 0) {
          return { position, player: availablePlayers[0].name };
        }
        return { position, player: 'Unassigned' };
      });
      this.saveData();
    },
    saveData() {
      localStorage.setItem('players', JSON.stringify(this.players));
      localStorage.setItem('schedule', JSON.stringify(this.schedule));
    },
    loadData() {
      const savedPlayers = localStorage.getItem('players');
      const savedSchedule = localStorage.getItem('schedule');
      if (savedPlayers) {
        this.players = JSON.parse(savedPlayers).map(player => {
          const defaultPositions = this.initializePositions();
          return {
            ...player,
            positions: {
              ...defaultPositions,
              ...player.positions
            },
            isEditing: false,
            editName: '',
            editNumber: null
          };
        });
      }
      if (savedSchedule) {
        this.schedule = JSON.parse(savedSchedule);
      }
    },
    initializePositions() {
      return this.positions.reduce((acc, position) => {
        acc[position] = 0;
        return acc;
      }, {});
    }
  },
  mounted() {
    this.loadData();
  }
});

app.use(vuetify);
app.mount('#app');
