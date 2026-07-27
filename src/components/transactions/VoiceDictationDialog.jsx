"use client";
import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Loader2, Sparkles, Check, RefreshCw } from "lucide-react";
import { useTransactions } from "@/contexts/transaction-context";
import { useToast } from "@/hooks/use-toast";

export function VoiceDictationDialog({ children, defaultDate }) {
  const [open, setOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [lang, setLang] = useState("bn-BD"); // "bn-BD" for Bengali, "en-US" for English
  const [parsedData, setParsedData] = useState({
    type: "income", // "income" or "expense"
    description: "",
    amount: "",
    paymentMode: "cash",
  });
  
  const { addAccountTransaction } = useTransactions();
  const { toast } = useToast();
  const recognitionRef = useRef(null);

  // Initialize Web Speech API
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = lang;

        recognition.onresult = (event) => {
          let currentTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
          autoParseSpeech(currentTranscript);
        };

        recognition.onerror = (event) => {
          setIsListening(false);
          // 'aborted' occurs when user stops recording or closes dialog. 'no-speech' is a silent timeout.
          if (event.error === "aborted" || event.error === "no-speech") {
            return;
          }
          console.error("Speech recognition error:", event.error);
          toast({
            title: "Microphone Error",
            description: `Speech recognition error: ${event.error}`,
            variant: "destructive",
          });
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;

        return () => {
          try {
            recognition.stop();
          } catch (e) {
            // ignore
          }
        };
      }
    }
  }, [lang]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Browser Not Supported",
        description: "Your browser does not support Voice Speech Recognition. Please use Chrome, Edge, or Safari.",
        variant: "destructive",
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setTranscript("");
      recognitionRef.current.lang = lang;
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // Rule-based regex parser to parse speech instantly on the fly
  const autoParseSpeech = (text) => {
    if (!text) return;
    const lowerText = text.toLowerCase();

    // 1. Detect Type (Income vs Expense)
    const isExpense =
      lowerText.includes("expense") ||
      lowerText.includes("cost") ||
      lowerText.includes("paid") ||
      lowerText.includes("খরচ") ||
      lowerText.includes("পেমেন্ট") ||
      lowerText.includes("দিয়েছি") ||
      lowerText.includes("ভাড়া");

    const type = isExpense ? "expense" : "income";

    // 2. Extract Numbers (Amounts in Bengali or English)
    const convertBnToEnDigits = (str) => {
      const bnDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
      return str.replace(/[০-৯]/g, (w) => bnDigits.indexOf(w));
    };

    const normalizedText = convertBnToEnDigits(text);
    const numbers = normalizedText.match(/\d+/g);
    const amount = numbers ? numbers[numbers.length - 1] : "";

    // 3. Extract Description (Remove amount & keyword noise)
    let description = text
      .replace(/[০-৯]/g, "")
      .replace(/\d+/g, "")
      .replace(/(taka|টাকা|income|expense|খরচ|জমা|পেমেন্ট| cash | bank | ব্যাংক | নগদ)/gi, "")
      .trim();

    // 4. Payment Mode
    const isBank =
      lowerText.includes("bank") ||
      lowerText.includes("bkash") ||
      lowerText.includes("nagad") ||
      lowerText.includes("ব্যাংক") ||
      lowerText.includes("বিকাশ");

    setParsedData({
      type,
      description: description || text,
      amount: amount || "",
      paymentMode: isBank ? "bank" : "cash",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!parsedData.amount || Number(parsedData.amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please speak or enter a valid transaction amount.",
        variant: "destructive",
      });
      return;
    }

    try {
      const dateStr = defaultDate || new Date().toISOString().split("T")[0];
      await addAccountTransaction({
        date: dateStr,
        description: parsedData.description || "Voice Entry",
        amount: Number(parsedData.amount),
        type: parsedData.type,
        category: parsedData.type === "income" ? "Customer Payment" : "Shop Expense",
        paymentMode: parsedData.paymentMode,
      });

      toast({
        title: "Transaction Saved!",
        description: `Added ${parsedData.type} entry of ৳${parsedData.amount} via voice.`,
      });

      setOpen(false);
      setTranscript("");
      setParsedData({
        type: "income",
        description: "",
        amount: "",
        paymentMode: "cash",
      });
    } catch (err) {
      console.error("Failed to save voice transaction:", err);
      toast({
        title: "Error Saving",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleOpenChange = (isOpen) => {
    if (!isOpen && isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (e) {
        // ignore
      }
      setIsListening(false);
    }
    setOpen(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="gap-2">
            <Mic className="h-4 w-4 text-primary" />
            <span>Voice Input</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Voice Dictation (Speech-to-Text)
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {/* Language Selector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Language:</span>
            <Button
              size="sm"
              variant={lang === "bn-BD" ? "default" : "outline"}
              onClick={() => setLang("bn-BD")}
              className="h-7 text-xs"
            >
              বাংলা (Bengali)
            </Button>
            <Button
              size="sm"
              variant={lang === "en-US" ? "default" : "outline"}
              onClick={() => setLang("en-US")}
              className="h-7 text-xs"
            >
              English
            </Button>
          </div>

          {/* Animated Big Microphone Button */}
          <button
            type="button"
            onClick={toggleListening}
            className={`relative flex h-24 w-24 items-center justify-center rounded-full transition-all duration-300 ${
              isListening
                ? "bg-red-500 text-white shadow-lg shadow-red-500/50 animate-pulse scale-110"
                : "bg-primary text-white hover:bg-primary/90 shadow-md"
            }`}
          >
            {isListening ? (
              <MicOff className="h-10 w-10" />
            ) : (
              <Mic className="h-10 w-10" />
            )}
          </button>

          <p className="text-center text-xs text-muted-foreground">
            {isListening
              ? "Listening... Speak clearly (e.g. 'আলমগীর ১৫০০ টাকা জমা' or 'Yarn cost 3000 taka')"
              : "Click the mic button and start speaking"}
          </p>

          {/* Live Transcript Display Box */}
          <div className="w-full rounded-md bg-muted p-3 text-sm min-h-[60px] border border-border">
            <span className="font-mono text-xs text-muted-foreground block mb-1">
              Live Transcript:
            </span>
            <p className="italic text-foreground">
              {transcript || "No speech detected yet..."}
            </p>
          </div>

          {/* Parsed Result Form */}
          <form onSubmit={handleSubmit} className="w-full space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Entry Type</Label>
                <div className="flex gap-1 mt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={parsedData.type === "income" ? "default" : "outline"}
                    className="w-full text-xs h-8"
                    onClick={() =>
                      setParsedData((prev) => ({ ...prev, type: "income" }))
                    }
                  >
                    Income (জমা)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={parsedData.type === "expense" ? "destructive" : "outline"}
                    className="w-full text-xs h-8"
                    onClick={() =>
                      setParsedData((prev) => ({ ...prev, type: "expense" }))
                    }
                  >
                    Expense (খরচ)
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-xs">Payment Mode</Label>
                <div className="flex gap-1 mt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={parsedData.paymentMode === "cash" ? "secondary" : "outline"}
                    className="w-full text-xs h-8"
                    onClick={() =>
                      setParsedData((prev) => ({ ...prev, paymentMode: "cash" }))
                    }
                  >
                    Cash
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={parsedData.paymentMode === "bank" ? "secondary" : "outline"}
                    className="w-full text-xs h-8"
                    onClick={() =>
                      setParsedData((prev) => ({ ...prev, paymentMode: "bank" }))
                    }
                  >
                    Bank
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs">Description</Label>
              <Input
                value={parsedData.description}
                onChange={(e) =>
                  setParsedData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Description"
                className="h-8 text-sm"
              />
            </div>

            <div>
              <Label className="text-xs">Amount (৳)</Label>
              <Input
                type="number"
                value={parsedData.amount}
                onChange={(e) =>
                  setParsedData((prev) => ({ ...prev, amount: e.target.value }))
                }
                placeholder="0.00"
                className="h-8 text-sm font-semibold"
              />
            </div>

            <Button type="submit" className="w-full gap-2">
              <Check className="h-4 w-4" />
              Save Voice Transaction
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
