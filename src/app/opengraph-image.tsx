import { ImageResponse } from "next/og";

export const alt = "Byayamshala - fitness, training, and gym management";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "68px 76px",
          color: "#f4fff7",
          background:
            "linear-gradient(120deg, #07150f 0%, #10291d 58%, #173c29 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: "-130px",
            top: "-190px",
            width: "570px",
            height: "570px",
            border: "2px solid rgba(125, 239, 157, 0.18)",
            borderRadius: "50%",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: "-20px",
            top: "-80px",
            width: "350px",
            height: "350px",
            border: "2px solid rgba(125, 239, 157, 0.22)",
            borderRadius: "50%",
            display: "flex",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            fontSize: "30px",
            fontWeight: 700,
            letterSpacing: "1px",
          }}
        >
          <div
            style={{
              width: "46px",
              height: "46px",
              borderRadius: "14px",
              background: "#7def9d",
              color: "#07150f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
              fontWeight: 800,
            }}
          >
            B
          </div>
          BYAYAMSHALA
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div
            style={{
              color: "#9af4b1",
              fontSize: "20px",
              fontWeight: 700,
              letterSpacing: "4px",
            }}
          >
            FITNESS. COMMUNITY. PROGRESS.
          </div>
          <div
            style={{
              maxWidth: "850px",
              fontSize: "76px",
              lineHeight: 1.08,
              fontWeight: 700,
              letterSpacing: "-2px",
            }}
          >
            Stronger, together.
          </div>
          <div
            style={{
              color: "#c5d8cb",
              fontSize: "27px",
              lineHeight: 1.4,
            }}
          >
            A smarter home for gyms, trainers, and members.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
