import 'reflect-metadata';
import { config } from 'dotenv';
config();

import { container } from 'tsyringe';
import { DIService, tsyringeDependencyRegistryEngine } from 'discordx';
import { CustomClient } from '@src/libs/common/discordjs/Client';

DIService.engine = tsyringeDependencyRegistryEngine.setInjector(container);

const client = container.resolve(CustomClient);
client.init();
