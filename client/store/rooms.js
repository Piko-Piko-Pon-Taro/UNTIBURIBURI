export const state = () => ({
  rooms: []
})

export const getters = {
  allByBuildingId: (state) => (buildingId) =>
    state.rooms.filter((r) => r.buildingId === Number(buildingId)),
  oneByRoomId: (state) => (roomId) =>
    state.rooms.find((r) => r.id === Number(roomId))
}

export const mutations = {
  setAll(state, { rooms }) {
    state.rooms = rooms
  },
  addMany(state, { rooms }) {
    rooms.forEach((room) => {
      if (state.rooms.find((stateRoom) => stateRoom.id === room.id)) return
      state.rooms.push(room)
    })
  },
  updateOne(state, { room }) {
    let isUpdated = false
    // あれば更新する
    state.rooms = state.rooms.map((stateRoom) => {
      if (Number(stateRoom.id) === Number(room.id)) {
        isUpdated = true
        return room
      } else {
        return stateRoom
      }
    })
    // なければ追加する
    if (!isUpdated) {
      state.rooms.push(room)
    }
  },
  seatAtTable(state, { roomId, tableId, user }) {
    state.rooms = state.rooms.map((stateRoom) => {
      if (Number(stateRoom.id) === Number(roomId)) {
        stateRoom.tables = stateRoom.tables.map((stateTable) => {
          if (Number(stateTable.id) === Number(tableId)) {
            if (
              !stateTable.users.find((u) => Number(u.id) === Number(user.id))
            ) {
              stateTable.users.push(user)
            }
          }
          return stateTable
        })
      }
      return stateRoom
    })
  },
  leaveFromTable(state, { roomId, tableId, userId }) {
    state.rooms = state.rooms.map((stateRoom) => {
      if (Number(stateRoom.id) === Number(roomId)) {
        stateRoom.tables = stateRoom.tables.map((stateTable) => {
          if (Number(stateTable.id) === Number(tableId)) {
            stateTable.users = stateTable.users.filter(
              (stateUser) => Number(stateUser.id) !== Number(userId)
            )
          }
          return stateTable
        })
      }
      return stateRoom
    })
  }
}

export const actions = {
  async fetchByCampusId({ commit }, { campusId }) {
    const { data } = await this.$axios.get(`rooms/campusId/${campusId}`)
    commit('setAll', { rooms: data.rooms })
  },
  async fetchByBuildingId({ commit }, { buildingId }) {
    const { data } = await this.$axios.get(`rooms/buildingId/${buildingId}`)
    commit('addMany', { rooms: data.rooms })
  },
  async updateByRoomId({ commit }, { roomId }) {
    const { data } = await this.$axios.get(`rooms/${roomId}`)
    commit('updateOne', { room: data.room })
  },
  SOCKET_someOneSitsDown({ commit }, { roomId, tableId, user }) {
    commit('seatAtTable', {
      roomId,
      tableId,
      user
    })
  },
  SOCKET_someOneStandsUp({ commit }, { roomId, tableId, userId }) {
    commit('leaveFromTable', {
      roomId,
      tableId,
      userId
    })
  }
}
