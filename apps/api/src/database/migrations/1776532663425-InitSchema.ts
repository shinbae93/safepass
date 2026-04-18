import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1776532663425 implements MigrationInterface {
    name = 'InitSchema1776532663425'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying(255) NOT NULL, "salt" character varying(255) NOT NULL, "passwordHash" character varying(255) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb" UNIQUE ("username"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "vault" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "title" text NOT NULL, "value" text NOT NULL, "notes" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_dd0898234c77f9d97585171ac59" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "vault" ADD CONSTRAINT "FK_81292a3b7eb9e7757a2202b5220" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "vault" DROP CONSTRAINT "FK_81292a3b7eb9e7757a2202b5220"`);
        await queryRunner.query(`DROP TABLE "vault"`);
        await queryRunner.query(`DROP TABLE "user"`);
    }

}
