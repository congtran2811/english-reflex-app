import sys
import asyncio
import edge_tts

async def synthesize(text, voice, rate="-5%", pitch="+0Hz"):
    # Build a conversational delivery with natural pauses and warm prosody
    # edge-tts python client natively handles text with prosody rate and pitch
    comm = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
    data = bytearray()
    async for chunk in comm.stream():
        if chunk["type"] == "audio":
            data.extend(chunk["data"])
    return data

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python tts_engine.py <voice> <output_file> <text...>")
        sys.exit(1)
    
    voice = sys.argv[1]
    out_file = sys.argv[2]
    rate = sys.argv[3] if len(sys.argv) > 3 else "-5%"
    pitch = sys.argv[4] if len(sys.argv) > 4 else "+0Hz"
    text = sys.stdin.read().strip()
    
    if not text:
        sys.exit(0)
        
    audio = asyncio.run(synthesize(text, voice, rate=rate, pitch=pitch))
    with open(out_file, "wb") as f:
        f.write(audio)
    print(f"SUCCESS {len(audio)}")
