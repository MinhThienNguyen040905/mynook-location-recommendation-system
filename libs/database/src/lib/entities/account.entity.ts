import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AccountType {
  CUSTOMER = 'customer',
  OWNER = 'owner',
  ADMIN = 'admin',
}

@Entity({ schema: 'auth_schema', name: 'accounts' })
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password_hash!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  full_name!: string | null;

  @Column({ type: 'text', nullable: true })
  avatar_url!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone_number!: string | null;

  @Column({ type: 'enum', enum: AccountType, default: AccountType.CUSTOMER })
  type!: AccountType;

  @Column({ type: 'int', default: 100 })
  trust_score!: number;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password_reset_token!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  password_reset_expires!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
