<template>
  <v-card :color="$const.BASE_COLOR" class="mx-auto pa-5 elevation-0">
    <v-card
      id="videos-container"
      :color="$const.BASE_COLOR"
      :max-width="
        peerStreams.length === 3 ? videoWidth * 2 + videoWidth / 2 : '100%'
      "
      :min-width="viewVideoWidth"
      class="mx-auto elevation-0"
    >
      <v-row no-gutters>
        <v-col>
          <VideoCard
            v-if="localStream"
            :id="'self'"
            :videoWidth="viewVideoWidth"
            :videoHeight="viewVideoHeight"
            :user="user"
            :stream="localStream"
            :isMicOn="isMicOn"
            :muted="true"
            class="pb-0 mb-5"
          />
        </v-col>
        <v-col
          v-for="peerStream in peerStreams"
          :key="peerStream.peerId"
          :width="viewVideoWidth"
        >
          <VideoCard
            :id="peerStream.peerId"
            :videoWidth="viewVideoWidth"
            :videoHeight="viewVideoHeight"
            :stream="peerStream"
            :user="
              peerUsers.find((user) => user.id.toString() === peerStream.peerId)
            "
            :muted="false"
            class="pb-0 mb-5"
          />
        </v-col>
      </v-row>
    </v-card>

    <v-bottom-navigation
      :background-color="$const.BASE_COLOR2"
      :value="naviValue"
      :min-width="viewVideoWidth"
      style="color:rgba(0, 0, 0, 0.6)"
      horizontal
    >
      <v-btn
        @click="
          $emit('leave')
          $emit('navi', 'hangup')
        "
        :min-width="'24px'"
        value="hangup"
      >
        <span class="d-none d-sm-block ml-2">Leave</span>
        <v-icon class="mr-0">mdi-phone-hangup</v-icon>
      </v-btn>

      <v-btn @click="toggleCamera" :min-width="'24px'" value="video">
        <span class="d-none d-sm-block ml-2">Video</span>
        <v-icon v-if="isCamOn" class="mr-0">mdi-video</v-icon>
        <v-icon v-if="!isCamOn" class="mr-0">mdi-video-off</v-icon>
      </v-btn>

      <v-btn @click="toggleMic" :min-width="'24px'" value="mic">
        <span class="d-none d-sm-block ml-2">Mic</span>
        <v-icon v-if="isMicOn" class="mr-0">mdi-microphone</v-icon>
        <v-icon v-if="!isMicOn" class="mr-0">mdi-microphone-off</v-icon>
      </v-btn>

      <v-btn
        @click="
          $emit('chat')
          $emit('navi', 'chat')
        "
        :min-width="'24px'"
        value="chat"
      >
        <span class="d-none d-sm-block ml-2">Chat</span>
        <v-icon class="mr-0">mdi-chat</v-icon>
      </v-btn>

      <!-- 相手の音ミュート用 -->
      <!-- <v-btn>
        <span value="speaker">Speaker</span>
        <v-icon class="mr-0">mdi-volume-high</v-icon>
        <v-icon class="mr-0">mdi-volume-off</v-icon>
      </v-btn>-->

      <v-dialog v-model="dialog" persistent max-width="600px">
        <template v-slot:activator="{ on, attrs }">
          <v-btn
            v-bind="attrs"
            v-on="on"
            @click="$emit('navi', 'cog')"
            :min-width="'24px'"
            value="cog"
          >
            <span class="d-none d-sm-block ml-2">Settings</span>
            <v-icon class="mr-0">mdi-cog</v-icon>
          </v-btn>
        </template>
        <v-card>
          <v-card-title>
            <span class="headline">Settings</span>
          </v-card-title>
          <v-card-subtitle v-if="!selectedAudio || !selectedVideo">
            <span>マイクとカメラを選択してください</span>
          </v-card-subtitle>
          <v-card-text class="my-0 pt-3 pb-0">
            <v-container class="my-0 py-0">
              <v-row class="my-0 py-0">
                <v-col cols="12" class="my-0 py-0">
                  <v-select
                    v-model="selectedAudio"
                    @change="onDeviceChange"
                    :items="audioDevices"
                    label="Select Audio"
                    outlined
                  ></v-select>
                </v-col>
                <v-col cols="12" class="my-0 py-0">
                  <v-select
                    v-model="selectedVideo"
                    @change="onDeviceChange"
                    :items="videoDevices"
                    label="Select Camera"
                    outlined
                  ></v-select>
                </v-col>
              </v-row>
            </v-container>
          </v-card-text>
          <v-card-actions>
            <ActionButton
              @click="onApplyChanges"
              text="Ok"
              class="mx-auto my-0 py-0"
            />
            <!-- <ActionButton
              v-if="deviceModified"
              @click="onApplyChanges"
              text="Apply"
              class="mx-auto my-0 py-0"
            /> -->
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-bottom-navigation>
  </v-card>
</template>

<script>
let Peer
if (process.client) {
  Peer = require('skyway-js')
}
export default {
  components: {
    VideoCard: () => import('@/components/organisms/VideoCard'),
    ActionButton: () => import('@/components/atoms/ActionButton')
  },
  props: {
    user: {
      type: Object,
      default: null
    },
    tables: {
      type: Array,
      default: null
    },
    seatedTableId: {
      type: Number,
      default: null
    },
    naviValue: {
      type: String,
      default: null
    }
  },
  data() {
    return {
      dialog: false,
      selectedAudio: null, // deviceId
      selectedVideo: null, // deviceId
      audioDevices: [],
      videoDevices: [],
      videoWidth: 300, // size of actual video
      videoHeight: 240,
      viewVideoWidth: null, // size of video on display
      viewVideoHeight: null,
      peerStreams: [],
      peerUsers: null, // for peer names and icons at VideoCard
      localStream: null,
      peerId: '',
      connectedRoomId: '',
      existingCall: null,
      isTalking: false,
      defDeviceOn: false, // 通話参加時のmic/video
      isMicOn: false,
      isCamOn: false
      // deviceModified: false
    }
  },
  created() {
    if (process.client) {
      this.initPeer()
      // calculate video size
      const w = window.parent.screen.width // eslint-disable-line
      if (w * 0.7 < this.videoWidth) {
        // change video size if viewport is too small
        this.viewVideoWidth = w * 0.7
      } else {
        // default viewport
        this.viewVideoWidth = this.videoWidth
      }
      // set video-height based on video-width
      this.viewVideoHeight = this.viewVideoWidth * 0.8
    }
  },
  methods: {
    async initPeer() {
      const credential = await this.getCredential()
      this.peer = new Peer(this.user.id, {
        key: process.env.SKYWAY_API_KEY,
        credential,
        debug: process.env.NODE_ENV === 'production' ? 0 : 1
      })

      this.peer.on('open', () => {
        this.peerId = this.peer.id
      })
      this.peer.on('expiresin', (sec) => {
        // Create new credential and Update the credential here.
        this.getCredential().then((credential) => {
          this.peer.updateCredential(credential)
        })
      })
      this.peer.on('error', (err) => {
        switch (err.type) {
          case 'invalid-key':
            alert('ビデオ通話サーバーに接続できません')
            break
          case 'unavailable-id':
            alert(
              '他のタブやデバイスから教室に入室済みです。\n他の接続を切断してから入室しなおしてください。'
            )
            break
          case 'authentication':
            alert('認証に失敗しました。')
            break
          case 'socket-error':
            alert('サーバーとの接続が失われました。')
            break
          case 'server-error':
            alert(
              'サーバーとの接続中に問題がありました。\n 少し待って、リトライしてください。'
            )
            break
          case 'signaling-limited':
          case 'sfu-limited':
          case 'turn-limited':
            alert(
              'サーバーが停止中です。\nしばらく時間をおいてから再度お試しください。'
            )
            break
          default:
            alert('接続エラー')
            // デバイスのストップ
            this.localStream.getAudioTracks()[0].stop()
            this.localStream.getVideoTracks()[0].stop()
        }
        this.$emit('leave')
      })
    },

    async getCredential() {
      try {
        const { data } = await this.$axios.post('/video/authenticate', {
          peerId: this.user.id,
          sessionToken: '' // sessionTokenチェック未使用
        })
        return data
      } catch (err) {
        alert(err)
      }
    },
    async setDeviceList() {
      try {
        const deviceInfos = await navigator.mediaDevices.enumerateDevices()
        for (let i = 0; i !== deviceInfos.length; ++i) {
          const deviceInfo = deviceInfos[i]
          if (deviceInfo.kind === 'audioinput') {
            this.audioDevices.push({
              text:
                deviceInfo.label || `Microphone ${this.audioDevices.length}`,
              value: deviceInfo.deviceId
            })
          } else if (deviceInfo.kind === 'videoinput') {
            this.videoDevices.push({
              text: deviceInfo.label || `Camera  ${this.videoDevices.length}`,
              value: deviceInfo.deviceId
            })
          }
        }
      } catch (err) {
        alert('デバイスに接続できません')
      }
    },

    // sets stream with default devices
    async setDefaultStream() {
      try {
        const constraints = {
          video: {
            width: { exact: this.videoWidth },
            height: { exact: this.videoHeight }
          },
          audio: true
        }
        const stream = await navigator.mediaDevices.getUserMedia(constraints)

        this.localStream = stream

        // get current deviceId (used in settings)
        const connectedAudio = this.localStream.getAudioTracks()[0].label
        const connectedVideo = this.localStream.getVideoTracks()[0].label
        await this.setDeviceList()

        this.selectedAudio = this.audioDevices.find(
          (audio) => audio.text === connectedAudio
        )
        this.selectedVideo = this.videoDevices.find(
          (video) => video.text === connectedVideo
        )
      } catch (err) {
        alert('デバイスに接続できません')
      }
    },

    // sets stream with selected devices
    async setLocalStream() {
      try {
        const constraints = {
          audio: this.selectedAudio ? { deviceId: this.selectedAudio } : false,
          video: this.selectedVideo ? { deviceId: this.selectedVideo } : false
        }

        if (constraints.video) {
          constraints.video.width = {
            exact: this.videoWidth
          }
          constraints.video.height = {
            exact: this.videoHeight
          }
        }
        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        this.localStream = stream
      } catch (err) {
        alert(err)
      }
    },

    // ミュート＆カメラオフ用
    setupDevices() {
      this.isMicOn = this.defDeviceOn
      this.isCamOn = this.defDeviceOn
      this.localStream.getAudioTracks()[0].enabled = this.isMicOn
      this.localStream.getVideoTracks()[0].enabled = this.isCamOn
    },

    async initChat(chatId) {
      // skywayとの疎通が取れる前の動作防止
      if (!this.peer) {
        return
      }

      // wifi切れた時用
      if (!this.peer.open) {
        await this.initPeer()
      }

      if (!this.selectedAudio || !this.selectedVideo) {
        await this.setDefaultStream()
      } else {
        await this.setDeviceList() // 利用可能なデバイスが増えたor減った時用
        await this.setLocalStream()
      }
      this.makeCall(chatId)
    },

    makeCall(chatId) {
      this.setupDevices()
      const call = this.peer.joinRoom(chatId, {
        mode: 'sfu',
        stream: this.localStream
      })
      if (!call) {
        // ネットワークエラーの時用
        return
      }
      this.setupCallEventHandlers(call)
    },

    setupCallEventHandlers(call) {
      this.closeCall()
      this.existingCall = call
      this.setupEndCallUI()
      this.connectedRoomId = call.name

      call.on('stream', (stream) => {
        const table = this.tables.filter(
          (table) => table.id === this.seatedTableId
        )[0]
        this.peerUsers = table.users.filter((user) => user.id !== this.user.id)

        this.addVideo(stream)
      })

      call.on('peerLeave', (peerId) => {
        this.removeVideo(peerId)
      })

      call.on('close', () => {
        this.removeAllVideos()
        this.setupMakeCallUI()
      })
    },

    addVideo(stream) {
      this.peerStreams.push(stream)
    },

    removeVideo(peerId) {
      this.peerStreams.some((v, i) => {
        if (v.peerId === peerId) this.peerStreams.splice(i, 1)
      })
    },

    removeAllVideos() {
      this.peerStreams = []
    },

    setupMakeCallUI() {
      this.isTalking = false
    },

    setupEndCallUI() {
      this.isTalking = true
    },

    toggleMic() {
      this.$emit('navi', 'mic')
      if (this.localStream) {
        const audioTrack = this.localStream.getAudioTracks()[0]
        audioTrack.enabled = !audioTrack.enabled
        this.isMicOn = !this.isMicOn
      }
    },
    toggleCamera() {
      this.$emit('navi', 'video')
      if (this.localStream) {
        const videoTrack = this.localStream.getVideoTracks()[0]
        videoTrack.enabled = !videoTrack.enabled
        this.isCamOn = !this.isCamOn
      }
    },
    onDeviceChange() {
      // this.deviceModified = true
      // later
    },
    async onApplyChanges() {
      try {
        await this.setLocalStream() // set localStream
        // carry on device status
        this.localStream.getAudioTracks()[0].enabled = this.isMicOn
        this.localStream.getVideoTracks()[0].enabled = this.isCamOn
        this.existingCall.replaceStream(this.localStream)

        this.dialog = false
      } catch (err) {
        alert(err)
      }
    },
    closeCall() {
      if (this.existingCall) {
        this.existingCall.close()
        this.localStream.getAudioTracks()[0].stop()
        this.localStream.getVideoTracks()[0].stop()
        this.existingCall = null
      }
    }
  }
}
</script>
