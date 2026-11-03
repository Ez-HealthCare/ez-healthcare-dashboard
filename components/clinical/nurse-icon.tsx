import Image from "next/image";

export function NurseIcon({
  name,
  width = 18,
  height = width,
}: {
  name: string;
  width?: number;
  height?: number;
}) {
  return (
    <Image src={`/nurse/${name}.svg`} width={width} height={height} alt="" aria-hidden="true" />
  );
}
