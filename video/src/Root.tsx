import { Composition } from "remotion";
import { SolSignalDemo } from "./SolSignalDemo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="SolSignalDemo"
        component={SolSignalDemo}
        durationInFrames={30 * 60}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
