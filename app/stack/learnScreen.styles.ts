import { StyleSheet } from "react-native";
import { Colors } from "../../constants/colors";

export const learnScreenStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
  },
  background: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "100%",
    backgroundColor: Colors.primary_100,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  progressText: {
    fontSize: 18,
    color: Colors.primary_700,
  },
});
