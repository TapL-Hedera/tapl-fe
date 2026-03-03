import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity('workflow_id_updates')
@Unique(['transactionHash', 'logIndex'])
export class WorkflowIdUpdate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  transactionHash: string;

  @Column()
  @Index()
  contractAddress: string;

  @Column()
  @Index()
  blockNumber: number;

  @Column()
  blockTimestamp: number;

  @Column()
  logIndex: number;

  @Column({ type: 'varchar' })
  previousId: string;

  @Column({ type: 'varchar' })
  newId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
