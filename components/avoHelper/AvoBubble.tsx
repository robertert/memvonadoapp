import React, { useRef, useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { Colors, Fonts } from "../../constants/colors";
import TypingDots from "./TypingDots";
import type { AvoMessage } from "../../hooks/useAvoHelper";
import type { AvoChipType, AvoCardContext } from "@/types/schemas/api/avoHelper";
import Markdown from "react-native-markdown-display";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface AvoBubbleProps {
  visible: boolean;
  onClose: () => void;
  messages: AvoMessage[];
  isLoading: boolean;
  isLimitReached: boolean;
  remainingQueries: number | null;
  onChipPress: (chipType: AvoChipType, customQuestion?: string) => void;
}

const CHIPS: { type: AvoChipType; label: string }[] = [
  { type: "explain_answer", label: "Wyjaśnij" },
  { type: "mnemonic", label: "Mnemotechnika" },
  { type: "use_in_sentence", label: "Zdanie" },
  { type: "custom", label: "Zapytaj..." },
];

export default function AvoBubble({
  visible,
  onClose,
  messages,
  isLoading,
  isLimitReached,
  remainingQueries,
  onChipPress,
}: AvoBubbleProps): React.JSX.Element {
  const scrollRef = useRef<ScrollView>(null);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customText, setCustomText] = useState("");

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0 || isLoading) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, isLoading]);

  function handleChipPress(chipType: AvoChipType) {
    if (isLimitReached) return;

    if (chipType === "custom") {
      setShowCustomInput(true);
      return;
    }
    onChipPress(chipType);
  }

  function handleCustomSubmit() {
    if (!customText.trim()) return;
    onChipPress("custom", customText.trim());
    setCustomText("");
    setShowCustomInput(false);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalRoot}
      >
        {/* Tap outside to close */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.bubble}>
          {/* Messages area */}
          <ScrollView
            ref={scrollRef}
            style={styles.messagesScroll}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.length === 0 && !isLoading && (
              <Text style={styles.emptyText}>
                Zapytaj mnie o tę kartę!
              </Text>
            )}

            {messages.map((msg) => {

              const isUser = msg.type !== "avo_response";
                            
              // Tworzymy style markdown dynamicznie, aby dopasować kolory
              const markdownStyles = {
                body: {
                  fontFamily: Fonts.primary,
                  fontSize: 14,
                  lineHeight: 20,
                  color: isUser ? Colors.primary_100 : Colors.primary_700,
                },
                paragraph: {
                  marginTop: 0,
                  marginBottom: 0,
                  flexWrap: "wrap",
                },
                bullet_list_icon: {
                  color: isUser ? Colors.primary_100 : Colors.primary_700,
                  marginLeft: 4,
                },
                ordered_list_icon: {
                  color: isUser ? Colors.primary_100 : Colors.primary_700,
                  marginLeft: 4,
                },
              } as StyleSheet.NamedStyles<any>;
              
              return (
              <View
                key={msg.id}
                style={[
                  styles.messageBubble,
                  msg.type === "avo_response"
                    ? styles.avoMessage
                    : styles.userMessage,
                ]}
              >
                <Markdown style={markdownStyles}>{msg.text}</Markdown>
              </View>
            );
          })}

            {isLoading && (
              <View style={[styles.messageBubble, styles.avoMessage]}>
                <TypingDots />
              </View>
            )}
          </ScrollView>

          {/* Limit info */}
          {isLimitReached && (
            <Text style={styles.limitText}>
              Osiągnąłeś dzienny limit pytań.
            </Text>
          )}
          {remainingQueries !== null && !isLimitReached && (
            <Text style={styles.remainingText}>
              Pozostało: {remainingQueries}
            </Text>
          )}

          {/* Custom input row */}
          {showCustomInput && (
            <View style={styles.customInputRow}>
              <TextInput
                style={styles.customInput}
                placeholder="Wpisz pytanie..."
                placeholderTextColor={Colors.primary_700_50}
                value={customText}
                onChangeText={setCustomText}
                onSubmitEditing={handleCustomSubmit}
                autoFocus
                maxLength={500}
              />
              <Pressable
                onPress={handleCustomSubmit}
                style={[
                  styles.sendButton,
                  !customText.trim() && styles.sendButtonDisabled,
                ]}
                disabled={!customText.trim()}
              >
                <Text style={styles.sendButtonText}>→</Text>
              </Pressable>
            </View>
          )}

          {/* Chip row */}
          <View style={styles.chipRow}>
            {CHIPS.map((chip) => (
              <Pressable
                key={chip.type}
                onPress={() => handleChipPress(chip.type)}
                disabled={isLimitReached || isLoading}
                style={[
                  styles.chip,
                  (isLimitReached || isLoading) && styles.chipDisabled,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    (isLimitReached || isLoading) && styles.chipTextDisabled,
                  ]}
                >
                  {chip.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  bubble: {
    width: "92%",
    maxHeight: SCREEN_HEIGHT * 0.5,
    backgroundColor: Colors.primary_100,
    borderRadius: 16,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
    borderColor: Colors.primary_700_30,
  },
  messagesScroll: {
    maxHeight: SCREEN_HEIGHT * 0.3,
  },
  messagesContent: {
    paddingBottom: 8,
    gap: 8,
  },
  emptyText: {
    textAlign: "center",
    color: Colors.primary_700_50,
    fontFamily: Fonts.primary,
    fontSize: 14,
    paddingVertical: 20,
  },
  messageBubble: {
    maxWidth: "85%",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  avoMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: Colors.primary_700_30,
  },
  userMessage: {
    alignSelf: "flex-end",
    backgroundColor: Colors.primary_500,
  },
  messageText: {
    fontFamily: Fonts.primary,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.primary_700,
  },
  userMessageText: {
    color: "#FFFFFF",
  },
  limitText: {
    textAlign: "center",
    fontSize: 12,
    color: Colors.red,
    fontFamily: Fonts.primary,
    fontWeight: "600",
    marginVertical: 4,
  },
  remainingText: {
    textAlign: "right",
    fontSize: 11,
    color: Colors.primary_700_50,
    fontFamily: Fonts.primary,
    marginBottom: 4,
  },
  customInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.primary_700_30,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: Fonts.primary,
    fontSize: 14,
    color: Colors.primary_700,
    backgroundColor: "#FFFFFF",
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary_500,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    fontSize: 18,
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.primary_700,
  },
  chipDisabled: {
    backgroundColor: Colors.primary_700_30,
  },
  chipText: {
    fontSize: 12,
    fontFamily: Fonts.primary,
    fontWeight: "600",
    color: Colors.primary_100,
  },
  chipTextDisabled: {
    color: Colors.primary_700_50,
  },
});
