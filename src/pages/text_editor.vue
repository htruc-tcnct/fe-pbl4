<template>
  <div>
    <h1>Operational Transformation testbed</h1>
    <textarea
      v-model="text"
      @input="onInput"
      cols="80"
      rows="24"
      autofocus
      ref="textarea"
    ></textarea>
  </div>
</template>

<script>
import io from "socket.io-client";
import { DocState, Peer } from "./ot_toy";

export default {
  data() {
    return {
      text: "",
      oldText: "",
      pri: Math.floor(Math.random() * 0x1000000),
      ser: 0,
      socket: null,
      docState: new DocState(),
      peer: new Peer(),
    };
  },
  methods: {
    getId() {
      return this.pri * 0x100000 + this.ser++;
    },
    diffToOps(diff) {
      const [start, end, newstr] = diff;
      const result = [];
      for (let i = start; i < end; i++) {
        result.push({
          pri: this.pri,
          ty: "del",
          ix: this.docState.xform_ix(i),
          id: this.getId(),
        });
      }
      let ix = this.docState.xform_ix(end);
      for (let i = 0; i < newstr.length; i++) {
        result.push({
          pri: this.pri,
          ty: "ins",
          ix: ix + i,
          id: this.getId(),
          ch: newstr.charAt(i),
        });
      }
      return result;
    },
    getDiff(oldText, newText, cursor) {
      const delta = newText.length - oldText.length;
      const limit = Math.max(0, cursor - delta);
      let end = oldText.length;

      while (
        end > limit &&
        oldText.charAt(end - 1) === newText.charAt(end + delta - 1)
      ) {
        end -= 1;
      }

      let start = 0;
      const startLimit = cursor - Math.max(0, delta);

      while (
        start < startLimit &&
        oldText.charAt(start) === newText.charAt(start)
      ) {
        start += 1;
      }

      return [start, end, newText.slice(start, end + delta)];
    },
    onInput(event) {
      const diff = this.getDiff(
        this.oldText,
        this.text,
        event.target.selectionEnd
      );
      const ops = this.diffToOps(diff);

      ops.forEach((op) => {
        this.docState.add(op);
      });

      this.socket.emit("update", ops);
      console.log("ops:", JSON.stringify(ops));
      console.log("docState:", this.docState.get_str());

      this.oldText = this.text;
    },
  },
  mounted() {
    const URL = import.meta.env.VITE_SERVER_URL || "http://localhost:8000"; // Dùng biến môi trường hoặc fallback là localhost

    this.socket = io(URL, {
      withCredentials: true,
    });

    this.socket.on("update", (ops) => {
      console.log("from server:", JSON.stringify(ops));

      const rev = this.docState.ops.length;
      this.docState.points = [
        this.$refs.textarea.selectionStart,
        this.$refs.textarea.selectionEnd,
      ];

      ops.forEach((op) => {
        this.peer.merge_op(this.docState, op);
      });

      if (rev < this.docState.ops.length) {
        this.socket.emit("update", this.docState.ops.slice(rev));
      }

      this.text = this.docState.get_str();
      this.oldText = this.text;

      this.$refs.textarea.selectionStart = this.docState.points[0];
      this.$refs.textarea.selectionEnd = this.docState.points[1];
    });
  },
};
</script>

<style scoped>
h1 {
  font: 18px Arial, Helvetica;
}
</style>
