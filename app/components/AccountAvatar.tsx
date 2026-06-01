type AccountAvatarProps = {
  initials: string;
  imageUrl?: string | null;
};

export function AccountAvatar({ initials, imageUrl }: AccountAvatarProps) {
  if (imageUrl) {
    const avatarImage = `url("${imageUrl.replace(/"/g, "%22")}")`;

    return (
      <span
        className="account-avatar-photo"
        style={{ backgroundImage: avatarImage }}
        aria-hidden="true"
      />
    );
  }

  return <span className="account-avatar-initials">{initials}</span>;
}
